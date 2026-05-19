"""
TaskHub — Auth Middleware (JWT verification)
"""
from functools import wraps
from flask import request, jsonify, g
from ..services.supabase_client import get_supabase
from ..models.schemas import UserRole
import jwt
import os


def get_token_from_header() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def require_auth(f):
    """Decorator: requires valid Supabase JWT in Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_from_header()
        if not token:
            return jsonify({"error": "Missing authorization token"}), 401

        try:
            sb = get_supabase()
            user_response = sb.auth.get_user(token)
            if not user_response or not user_response.user:
                return jsonify({"error": "Invalid or expired token"}), 401

            auth_user = user_response.user
            # Fetch profile from users table
            profile_res = sb.table("users").select("*").eq("id", auth_user.id).single().execute()
            if not profile_res.data:
                return jsonify({"error": "User profile not found"}), 401

            g.user = profile_res.data
            g.user_id = auth_user.id
            g.token = token
            g.is_admin = profile_res.data.get("role") == UserRole.ADMIN

        except Exception as e:
            return jsonify({"error": "Authentication failed", "detail": str(e)}), 401

        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    """Decorator: requires admin role (use after @require_auth)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not getattr(g, "is_admin", False):
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated


def optional_auth(f):
    """Decorator: tries to authenticate but doesn't fail if not logged in."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_from_header()
        g.user = None
        g.user_id = None
        g.is_admin = False
        g.token = None

        if token:
            try:
                sb = get_supabase()
                user_response = sb.auth.get_user(token)
                if user_response and user_response.user:
                    profile_res = (
                        sb.table("users")
                        .select("*")
                        .eq("id", user_response.user.id)
                        .single()
                        .execute()
                    )
                    if profile_res.data:
                        g.user = profile_res.data
                        g.user_id = user_response.user.id
                        g.token = token
                        g.is_admin = profile_res.data.get("role") == "admin"
            except Exception:
                pass

        return f(*args, **kwargs)
    return decorated
