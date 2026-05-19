"""
TaskHub — Tasks Routes (Admin + User)
"""
from flask import Blueprint, jsonify, request, g
from ..utils.auth_middleware import require_auth, require_admin
from ..services.supabase_client import get_supabase
from ..services.storage_service import upload_product_image
from ..services.email_service import send_task_assigned_email, send_task_submitted_email
from ..models.schemas import TaskCreate, TaskAssign, TaskRevisionRequest, TaskStatus
from pydantic import ValidationError
import random
import datetime

tasks_bp = Blueprint("tasks", __name__)


def _log_audit(user_id: str, action: str, entity_type: str, entity_id: str, details: dict):
    try:
        sb = get_supabase()
        sb.table("audit_logs").insert({
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details": details,
        }).execute()
    except Exception:
        pass  # Audit logs should never break main flow


def _build_task_response(task: dict, sb) -> dict:
    """Enrich task with user profiles and generation count."""
    # Fetch assigned_to profile
    if task.get("assigned_to"):
        try:
            profile = sb.table("users").select("id,email,name,role,avatar_url").eq("id", task["assigned_to"]).single().execute()
            task["assigned_to_profile"] = profile.data
        except Exception:
            task["assigned_to_profile"] = None
    else:
        task["assigned_to_profile"] = None

    # Fetch created_by profile
    if task.get("created_by"):
        try:
            profile = sb.table("users").select("id,email,name,role,avatar_url").eq("id", task["created_by"]).single().execute()
            task["created_by_profile"] = profile.data
        except Exception:
            task["created_by_profile"] = None
    else:
        task["created_by_profile"] = None

    # Count generations
    try:
        count_res = sb.table("generated_images").select("id", count="exact").eq("task_id", task["id"]).eq("status", "done").execute()
        task["generation_count"] = count_res.count or 0
    except Exception:
        task["generation_count"] = 0

    return task


# ============================================================
# ADMIN: Create task
# ============================================================
@tasks_bp.post("/tasks")
@require_auth
@require_admin
def create_task():
    """Create a new task with product image upload."""
    if "product_image" not in request.files:
        return jsonify({"error": "product_image file is required"}), 400

    file = request.files["product_image"]
    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()

    if not title:
        return jsonify({"error": "title is required"}), 400

    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    try:
        # Upload image to Supabase Storage
        image_url = upload_product_image(file, g.user_id)

        sb = get_supabase()
        seed = random.randint(1, 2**31 - 1)

        task_data = {
            "title": title,
            "description": description or None,
            "product_image_url": image_url,
            "created_by": g.user_id,
            "status": TaskStatus.PENDING,
            "generation_seed": seed,
        }

        res = sb.table("tasks").insert(task_data).execute()
        task = res.data[0]

        _log_audit(g.user_id, "task_created", "task", task["id"], {"title": title})

        task = _build_task_response(task, sb)
        return jsonify({"task": task}), 201

    except Exception as e:
        return jsonify({"error": "Failed to create task", "detail": str(e)}), 500


# ============================================================
# ADMIN: List all tasks
# ============================================================
@tasks_bp.get("/tasks")
@require_auth
@require_admin
def list_tasks():
    """List all tasks with optional status filter."""
    status_filter = request.args.get("status")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    offset = (page - 1) * limit

    try:
        sb = get_supabase()
        query = sb.table("tasks").select("*", count="exact").order("created_at", desc=True)

        if status_filter:
            query = query.eq("status", status_filter)

        res = query.range(offset, offset + limit - 1).execute()
        tasks = [_build_task_response(t, sb) for t in (res.data or [])]

        return jsonify({
            "tasks": tasks,
            "total": res.count or 0,
            "page": page,
            "limit": limit,
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to fetch tasks", "detail": str(e)}), 500


# ============================================================
# ADMIN: Assign task to user
# ============================================================
@tasks_bp.post("/tasks/<task_id>/assign")
@require_auth
@require_admin
def assign_task(task_id: str):
    data = request.get_json(silent=True) or {}
    try:
        payload = TaskAssign(**data)
    except ValidationError as e:
        return jsonify({"error": "Validation error", "detail": e.errors()}), 422

    try:
        sb = get_supabase()

        # Verify task exists
        task_res = sb.table("tasks").select("*").eq("id", task_id).single().execute()
        if not task_res.data:
            return jsonify({"error": "Task not found"}), 404

        # Verify assignee exists and is a user
        user_res = sb.table("users").select("*").eq("id", payload.assigned_to).single().execute()
        if not user_res.data:
            return jsonify({"error": "User not found"}), 404

        # Update task
        update_res = (
            sb.table("tasks")
            .update({
                "assigned_to": payload.assigned_to,
                "status": TaskStatus.ASSIGNED,
            })
            .eq("id", task_id)
            .execute()
        )

        updated_task = update_res.data[0]
        _log_audit(g.user_id, "task_assigned", "task", task_id, {
            "assigned_to": payload.assigned_to,
        })

        # Send email notification
        assignee = user_res.data
        task = task_res.data
        send_task_assigned_email(
            to_email=assignee["email"],
            to_name=assignee.get("name") or assignee["email"],
            task_title=task["title"],
            task_id=task_id,
        )

        updated_task = _build_task_response(updated_task, sb)
        return jsonify({"task": updated_task}), 200

    except Exception as e:
        return jsonify({"error": "Failed to assign task", "detail": str(e)}), 500


# ============================================================
# ADMIN: Accept task submission
# ============================================================
@tasks_bp.put("/tasks/<task_id>/accept")
@require_auth
@require_admin
def accept_task(task_id: str):
    try:
        sb = get_supabase()
        task_res = sb.table("tasks").select("*").eq("id", task_id).single().execute()
        if not task_res.data:
            return jsonify({"error": "Task not found"}), 404

        task = task_res.data
        if task["status"] != TaskStatus.SUBMITTED:
            return jsonify({"error": f"Task must be in 'submitted' status, got '{task['status']}'"}), 400

        update_res = (
            sb.table("tasks")
            .update({"status": TaskStatus.ACCEPTED})
            .eq("id", task_id)
            .execute()
        )
        _log_audit(g.user_id, "task_accepted", "task", task_id, {})

        # Notify assignee
        if task.get("assigned_to"):
            user_res = sb.table("users").select("email,name").eq("id", task["assigned_to"]).single().execute()
            if user_res.data:
                from ..services.email_service import send_task_accepted_email
                send_task_accepted_email(
                    to_email=user_res.data["email"],
                    to_name=user_res.data.get("name") or user_res.data["email"],
                    task_title=task["title"],
                    task_id=task_id,
                )

        return jsonify({"task": update_res.data[0]}), 200
    except Exception as e:
        return jsonify({"error": "Failed to accept task", "detail": str(e)}), 500


# ============================================================
# ADMIN: Request revision
# ============================================================
@tasks_bp.put("/tasks/<task_id>/request-revision")
@require_auth
@require_admin
def request_revision(task_id: str):
    data = request.get_json(silent=True) or {}
    try:
        payload = TaskRevisionRequest(**data)
    except ValidationError as e:
        return jsonify({"error": "Validation error", "detail": e.errors()}), 422

    try:
        sb = get_supabase()
        task_res = sb.table("tasks").select("*").eq("id", task_id).single().execute()
        if not task_res.data:
            return jsonify({"error": "Task not found"}), 404

        task = task_res.data
        update_res = (
            sb.table("tasks")
            .update({
                "status": TaskStatus.REVISION_REQUESTED,
                "admin_notes": payload.admin_notes,
            })
            .eq("id", task_id)
            .execute()
        )
        _log_audit(g.user_id, "revision_requested", "task", task_id, {"notes": payload.admin_notes})

        # Notify assignee
        if task.get("assigned_to"):
            user_res = sb.table("users").select("email,name").eq("id", task["assigned_to"]).single().execute()
            if user_res.data:
                from ..services.email_service import send_revision_requested_email
                send_revision_requested_email(
                    to_email=user_res.data["email"],
                    to_name=user_res.data.get("name") or user_res.data["email"],
                    task_title=task["title"],
                    task_id=task_id,
                    notes=payload.admin_notes,
                )

        return jsonify({"task": update_res.data[0]}), 200
    except Exception as e:
        return jsonify({"error": "Failed to request revision", "detail": str(e)}), 500


# ============================================================
# ADMIN: Delete task
# ============================================================
@tasks_bp.delete("/tasks/<task_id>")
@require_auth
@require_admin
def delete_task(task_id: str):
    try:
        sb = get_supabase()
        sb.table("tasks").delete().eq("id", task_id).execute()
        _log_audit(g.user_id, "task_deleted", "task", task_id, {})
        return jsonify({"message": "Task deleted"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to delete task", "detail": str(e)}), 500


# ============================================================
# USER: Get my assigned tasks
# ============================================================
@tasks_bp.get("/my-tasks")
@require_auth
def my_tasks():
    try:
        sb = get_supabase()
        res = (
            sb.table("tasks")
            .select("*")
            .eq("assigned_to", g.user_id)
            .order("created_at", desc=True)
            .execute()
        )
        tasks = [_build_task_response(t, sb) for t in (res.data or [])]
        return jsonify({"tasks": tasks, "total": len(tasks)}), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch tasks", "detail": str(e)}), 500


# ============================================================
# USER/ADMIN: Get single task
# ============================================================
@tasks_bp.get("/tasks/<task_id>")
@require_auth
def get_task(task_id: str):
    try:
        sb = get_supabase()
        res = sb.table("tasks").select("*").eq("id", task_id).single().execute()
        if not res.data:
            return jsonify({"error": "Task not found"}), 404

        task = res.data

        # Users can only see their assigned tasks
        if not g.is_admin and task.get("assigned_to") != g.user_id:
            return jsonify({"error": "Not authorized"}), 403

        task = _build_task_response(task, sb)
        return jsonify({"task": task}), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch task", "detail": str(e)}), 500


# ============================================================
# USER: Start task (pending/assigned → in_progress)
# ============================================================
@tasks_bp.put("/tasks/<task_id>/start")
@require_auth
def start_task(task_id: str):
    try:
        sb = get_supabase()
        res = sb.table("tasks").select("*").eq("id", task_id).single().execute()
        if not res.data:
            return jsonify({"error": "Task not found"}), 404

        task = res.data
        if task.get("assigned_to") != g.user_id:
            return jsonify({"error": "Not authorized"}), 403

        if task["status"] not in (TaskStatus.ASSIGNED, TaskStatus.REVISION_REQUESTED):
            return jsonify({"error": f"Cannot start task in status '{task['status']}'"}), 400

        update_res = (
            sb.table("tasks")
            .update({"status": TaskStatus.IN_PROGRESS})
            .eq("id", task_id)
            .execute()
        )
        _log_audit(g.user_id, "task_started", "task", task_id, {})
        return jsonify({"task": update_res.data[0]}), 200
    except Exception as e:
        return jsonify({"error": "Failed to start task", "detail": str(e)}), 500


# ============================================================
# USER: Submit task (in_progress → submitted)
# ============================================================
@tasks_bp.post("/tasks/<task_id>/submit")
@require_auth
def submit_task(task_id: str):
    try:
        sb = get_supabase()
        res = sb.table("tasks").select("*").eq("id", task_id).single().execute()
        if not res.data:
            return jsonify({"error": "Task not found"}), 404

        task = res.data
        if task.get("assigned_to") != g.user_id:
            return jsonify({"error": "Not authorized"}), 403

        if task["status"] != TaskStatus.IN_PROGRESS:
            return jsonify({"error": "Task must be in_progress to submit"}), 400

        # Verify all 8 image types are generated
        gen_res = (
            sb.table("generated_images")
            .select("image_type, status")
            .eq("task_id", task_id)
            .execute()
        )
        all_types = {
            "white_bg", "theme_marble", "theme_velvet",
            "lifestyle_beach", "lifestyle_studio",
            "model_front", "model_side", "model_closeup",
        }
        done_types = {g_["image_type"] for g_ in (gen_res.data or []) if g_["status"] == "done"}

        if not all_types.issubset(done_types):
            missing = all_types - done_types
            return jsonify({
                "error": "Not all images are generated",
                "missing": list(missing),
            }), 400

        update_res = (
            sb.table("tasks")
            .update({"status": TaskStatus.SUBMITTED})
            .eq("id", task_id)
            .execute()
        )
        _log_audit(g.user_id, "task_submitted", "task", task_id, {})

        # Notify admin(s)
        admin_res = sb.table("users").select("email,name").eq("role", "admin").execute()
        for admin in (admin_res.data or []):
            send_task_submitted_email(
                to_email=admin["email"],
                to_name=admin.get("name") or "Admin",
                task_title=task["title"],
                task_id=task_id,
                submitted_by=g.user.get("name") or g.user.get("email"),
            )

        return jsonify({"task": update_res.data[0]}), 200
    except Exception as e:
        return jsonify({"error": "Failed to submit task", "detail": str(e)}), 500


# ============================================================
# ADMIN: Analytics summary
# ============================================================
@tasks_bp.get("/admin/analytics")
@require_auth
@require_admin
def analytics():
    try:
        sb = get_supabase()
        all_tasks = sb.table("tasks").select("status, created_at").execute()
        tasks = all_tasks.data or []

        status_counts = {}
        for t in tasks:
            s = t["status"]
            status_counts[s] = status_counts.get(s, 0) + 1

        all_users = sb.table("users").select("id", count="exact").eq("role", "user").execute()
        gen_count = sb.table("generated_images").select("id", count="exact").eq("status", "done").execute()

        return jsonify({
            "total_tasks": len(tasks),
            "status_breakdown": status_counts,
            "total_users": all_users.count or 0,
            "total_generated_images": gen_count.count or 0,
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch analytics", "detail": str(e)}), 500
