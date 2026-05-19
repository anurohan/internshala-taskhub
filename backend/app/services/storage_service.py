"""
TaskHub — Storage Service (Supabase Storage)
"""
from __future__ import annotations
import io
import uuid
import logging
from werkzeug.datastructures import FileStorage
from ..services.supabase_client import get_supabase

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def upload_product_image(file: FileStorage, user_id: str) -> str:
    """Upload product image to Supabase Storage and return public URL."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError(f"Invalid file type: {file.content_type}")

    file_bytes = file.read()
    if len(file_bytes) > MAX_SIZE_BYTES:
        raise ValueError("File size exceeds 10 MB limit")

    ext = _get_extension(file.content_type)
    filename = f"{user_id}/{uuid.uuid4()}{ext}"

    sb = get_supabase()
    sb.storage.from_("product-images").upload(
        path=filename,
        file=file_bytes,
        file_options={"content-type": file.content_type, "upsert": "false"},
    )

    url = sb.storage.from_("product-images").get_public_url(filename)
    logger.info(f"Uploaded product image: {url}")
    return url


def upload_generated_image(image_bytes: bytes, task_id: str, image_type: str) -> str:
    """Upload a generated AI image to Supabase Storage and return public URL."""
    filename = f"{task_id}/{image_type}/{uuid.uuid4()}.png"

    sb = get_supabase()
    sb.storage.from_("generated-images").upload(
        path=filename,
        file=image_bytes,
        file_options={"content-type": "image/png", "upsert": "true"},
    )

    url = sb.storage.from_("generated-images").get_public_url(filename)
    logger.info(f"Uploaded generated image: {url}")
    return url


def upload_bg_removed_image(image_bytes: bytes, task_id: str) -> str:
    """Upload background-removed product image."""
    filename = f"{task_id}/product_no_bg.png"

    sb = get_supabase()
    sb.storage.from_("product-images").upload(
        path=filename,
        file=image_bytes,
        file_options={"content-type": "image/png", "upsert": "true"},
    )

    return sb.storage.from_("product-images").get_public_url(filename)


def _get_extension(content_type: str) -> str:
    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    return mapping.get(content_type, ".jpg")
