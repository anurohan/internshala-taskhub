"""
TaskHub — Generations Routes (AI Studio)
"""
from flask import Blueprint, jsonify, request, g
from ..utils.auth_middleware import require_auth
from ..services.supabase_client import get_supabase
from ..workers.queue import get_queue
from ..workers.tasks import generate_image_job
from ..models.schemas import GenerateRequest, ImageType
from pydantic import ValidationError

generations_bp = Blueprint("generations", __name__)

ALL_IMAGE_TYPES = [
    "white_bg",
    "theme_marble",
    "theme_velvet",
    "lifestyle_beach",
    "lifestyle_studio",
    "model_front",
    "model_side",
    "model_closeup",
]


def _check_task_access(task_id: str, sb) -> dict | None:
    """Return task if user can access it, else None."""
    res = sb.table("tasks").select("*").eq("id", task_id).single().execute()
    if not res.data:
        return None
    task = res.data
    if not g.is_admin and task.get("assigned_to") != g.user_id:
        return None
    return task


# ============================================================
# POST /api/tasks/<id>/generate
# ============================================================
@generations_bp.post("/tasks/<task_id>/generate")
@require_auth
def generate_images(task_id: str):
    """Enqueue AI image generation jobs for the given task."""
    data = request.get_json(silent=True) or {}
    try:
        payload = GenerateRequest(**data)
    except ValidationError as e:
        return jsonify({"error": "Validation error", "detail": e.errors()}), 422

    try:
        sb = get_supabase()
        task = _check_task_access(task_id, sb)
        if not task:
            return jsonify({"error": "Task not found or access denied"}), 404

        if task["status"] not in ("in_progress", "revision_requested"):
            return jsonify({"error": f"Task must be in_progress to generate images (got '{task['status']}')"}), 400

        types_to_generate = (
            [t.value for t in payload.image_types]
            if payload.image_types
            else ALL_IMAGE_TYPES
        )

        q = get_queue()
        jobs_enqueued = []

        for image_type in types_to_generate:
            # Upsert a generation record (pending)
            existing = (
                sb.table("generated_images")
                .select("id, status")
                .eq("task_id", task_id)
                .eq("image_type", image_type)
                .execute()
            )

            if existing.data and existing.data[0]["status"] == "generating":
                # Skip already running
                continue

            if existing.data:
                gen_id = existing.data[0]["id"]
                sb.table("generated_images").update({
                    "status": "pending",
                    "image_url": None,
                    "error_message": None,
                }).eq("id", gen_id).execute()
            else:
                insert_res = sb.table("generated_images").insert({
                    "task_id": task_id,
                    "image_type": image_type,
                    "status": "pending",
                }).execute()
                gen_id = insert_res.data[0]["id"]

            # Enqueue job
            job = q.enqueue(
                generate_image_job,
                args=(task_id, gen_id, image_type),
                job_timeout=300,  # 5 min max
            )

            # Mark as generating
            sb.table("generated_images").update({
                "status": "generating",
                "metadata": {"job_id": job.id},
            }).eq("id", gen_id).execute()

            jobs_enqueued.append({
                "job_id": job.id,
                "generation_id": gen_id,
                "image_type": image_type,
            })

        return jsonify({
            "message": f"{len(jobs_enqueued)} generation job(s) enqueued",
            "jobs": jobs_enqueued,
        }), 202

    except Exception as e:
        return jsonify({"error": "Failed to enqueue generation", "detail": str(e)}), 500


# ============================================================
# GET /api/tasks/<id>/generations
# ============================================================
@generations_bp.get("/tasks/<task_id>/generations")
@require_auth
def list_generations(task_id: str):
    """List all generated images for a task."""
    try:
        sb = get_supabase()
        task = _check_task_access(task_id, sb)
        if not task:
            return jsonify({"error": "Task not found or access denied"}), 404

        res = (
            sb.table("generated_images")
            .select("*")
            .eq("task_id", task_id)
            .order("image_type")
            .execute()
        )

        generations = res.data or []
        completed = sum(1 for g_ in generations if g_["status"] == "done")

        return jsonify({
            "generations": generations,
            "total": len(generations),
            "completed": completed,
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to fetch generations", "detail": str(e)}), 500


# ============================================================
# DELETE /api/generations/<id>
# ============================================================
@generations_bp.delete("/generations/<gen_id>")
@require_auth
def delete_generation(gen_id: str):
    """Delete a generated image record."""
    try:
        sb = get_supabase()
        gen_res = sb.table("generated_images").select("*").eq("id", gen_id).single().execute()
        if not gen_res.data:
            return jsonify({"error": "Generation not found"}), 404

        gen = gen_res.data
        task = _check_task_access(gen["task_id"], sb)
        if not task:
            return jsonify({"error": "Access denied"}), 403

        sb.table("generated_images").delete().eq("id", gen_id).execute()
        return jsonify({"message": "Generation deleted"}), 200

    except Exception as e:
        return jsonify({"error": "Failed to delete generation", "detail": str(e)}), 500


# ============================================================
# PUT /api/generations/<id>/mark-final
# ============================================================
@generations_bp.put("/generations/<gen_id>/mark-final")
@require_auth
def mark_final(gen_id: str):
    """Toggle is_final flag on a generation."""
    try:
        sb = get_supabase()
        gen_res = sb.table("generated_images").select("*").eq("id", gen_id).single().execute()
        if not gen_res.data:
            return jsonify({"error": "Generation not found"}), 404

        gen = gen_res.data
        task = _check_task_access(gen["task_id"], sb)
        if not task:
            return jsonify({"error": "Access denied"}), 403

        update_res = (
            sb.table("generated_images")
            .update({"is_final": not gen["is_final"]})
            .eq("id", gen_id)
            .execute()
        )
        return jsonify({"generation": update_res.data[0]}), 200

    except Exception as e:
        return jsonify({"error": "Failed to update generation", "detail": str(e)}), 500
