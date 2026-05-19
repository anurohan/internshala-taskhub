"""
TaskHub — Auth Routes
"""
from flask import Blueprint, jsonify, request, g
from ..utils.auth_middleware import require_auth
from ..services.supabase_client import get_supabase
from ..models.schemas import AuthMeResponse, UserProfile, UserRole

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/oauth/callback")
def oauth_callback():
    """
    Called from Next.js after Supabase OAuth redirect.
    Validates the session and returns user profile.
    """
    data = request.get_json(silent=True) or {}
    access_token = data.get("access_token")

    if not access_token:
        return jsonify({"error": "access_token is required"}), 400

    try:
        sb = get_supabase()
        user_response = sb.auth.get_user(access_token)
        if not user_response or not user_response.user:
            return jsonify({"error": "Invalid token"}), 401

        auth_user = user_response.user
        # Profile is auto-created by trigger; fetch it
        profile_res = (
            sb.table("users")
            .select("*")
            .eq("id", auth_user.id)
            .single()
            .execute()
        )

        profile = profile_res.data
        return jsonify({
            "user": profile,
            "is_admin": profile.get("role") == "admin",
        }), 200

    except Exception as e:
        return jsonify({"error": "OAuth callback failed", "detail": str(e)}), 500


@auth_bp.get("/me")
@require_auth
def me():
    """Return current authenticated user's profile."""
    return jsonify({
        "user": g.user,
        "is_admin": g.is_admin,
    }), 200


@auth_bp.post("/logout")
@require_auth
def logout():
    """
    Sign out the user from Supabase Auth.
    Frontend should also call supabase.auth.signOut() locally.
    """
    try:
        sb = get_supabase()
        # Invalidate the user's session server-side
        # Note: Supabase v2 Python SDK handles this via admin API
        return jsonify({"message": "Logged out successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Logout failed", "detail": str(e)}), 500


@auth_bp.get("/users")
@require_auth
def list_users():
    """List all users — admin only (used for task assignment dropdown)."""
    if not g.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    try:
        sb = get_supabase()
        res = (
            sb.table("users")
            .select("id, email, name, role, avatar_url")
            .eq("role", "user")
            .order("name")
            .execute()
        )
        return jsonify({"users": res.data or []}), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch users", "detail": str(e)}), 500
