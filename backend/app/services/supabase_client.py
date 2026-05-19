"""
TaskHub — Supabase client (admin/service role)
"""
from supabase import create_client, Client
from ..config import settings

_client: Client | None = None


def get_supabase() -> Client:
    """Return a Supabase admin client (bypasses RLS for backend operations)."""
    global _client
    if _client is None:
        _client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,  # service role bypasses RLS
        )
    return _client


def get_user_supabase(access_token: str) -> Client:
    """Return a Supabase client authenticated as the given user (respects RLS)."""
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.auth.set_session(access_token, "")
    return client
