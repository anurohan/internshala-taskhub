"""
TaskHub — RQ Worker Job Definitions
This file runs in the worker process — keep imports minimal and self-contained.
"""
from __future__ import annotations
import logging
import requests
import io
from ..services.supabase_client import get_supabase
from ..services.ai_service import (
    remove_background,
    extract_product_descriptor,
    run_generation_pipeline,
)
from ..services.storage_service import upload_generated_image, upload_bg_removed_image

logger = logging.getLogger(__name__)


def generate_image_job(task_id: str, generation_id: str, image_type: str) -> dict:
    """
    RQ job: Run the full AI generation pipeline for one image slot.

    Steps:
    1. Fetch task from Supabase
    2. If bg-removed image doesn't exist → remove bg and save
    3. If product_descriptor doesn't exist → call GPT-4o and save
    4. Call Fal.ai with IP-Adapter
    5. Upload result to Supabase Storage
    6. Update generated_images record
    """
    sb = get_supabase()

    try:
        # ── 1. Fetch Task ─────────────────────────────────────────────────
        task_res = sb.table("tasks").select("*").eq("id", task_id).single().execute()
        if not task_res.data:
            raise ValueError(f"Task {task_id} not found")

        task = task_res.data
        product_image_url: str = task["product_image_url"]
        seed: int = task.get("generation_seed") or 42

        # ── 2. Background Removal (if not already done) ───────────────────
        bg_removed_url = task.get("product_image_removed_bg_url")
        if not bg_removed_url:
            logger.info(f"[{task_id}] Removing background from product image...")
            img_response = requests.get(product_image_url, timeout=30)
            img_response.raise_for_status()
            original_bytes = img_response.content

            bg_removed_bytes = remove_background(original_bytes)
            bg_removed_url = upload_bg_removed_image(bg_removed_bytes, task_id)

            sb.table("tasks").update({
                "product_image_removed_bg_url": bg_removed_url
            }).eq("id", task_id).execute()

            logger.info(f"[{task_id}] BG removed, URL: {bg_removed_url}")

        # ── 3. Product Descriptor (if not already extracted) ─────────────
        product_descriptor = task.get("product_descriptor")
        if not product_descriptor:
            logger.info(f"[{task_id}] Extracting product descriptor via GPT-4o...")
            img_response = requests.get(product_image_url, timeout=30)
            img_response.raise_for_status()
            product_descriptor = extract_product_descriptor(img_response.content)

            sb.table("tasks").update({
                "product_descriptor": product_descriptor
            }).eq("id", task_id).execute()

            logger.info(f"[{task_id}] Descriptor: {product_descriptor[:80]}...")

        # ── 4. Run Fal.ai Generation ──────────────────────────────────────
        result = run_generation_pipeline(
            task_id=task_id,
            generation_id=generation_id,
            image_type=image_type,
            product_image_url=product_image_url,
            product_image_removed_bg_url=bg_removed_url,
            product_descriptor=product_descriptor,
            seed=seed,
        )

        generated_url = result["image_url"]

        # ── 5. Download & re-upload to Supabase Storage ──────────────────
        # (Ensures we control the image URL lifecycle)
        gen_response = requests.get(generated_url, timeout=60)
        gen_response.raise_for_status()
        final_url = upload_generated_image(gen_response.content, task_id, image_type)

        # ── 6. Update DB record ───────────────────────────────────────────
        from ..services.ai_service import SCENE_PROMPTS
        scene = SCENE_PROMPTS.get(image_type, {})
        prompt_used = scene.get("prompt", "").format(product_descriptor=product_descriptor)

        sb.table("generated_images").update({
            "status": "done",
            "image_url": final_url,
            "prompt_used": prompt_used,
            "metadata": {
                "seed": seed,
                "fal_url": generated_url,
                "model": "fal-ai/flux-general",
                "ip_adapter_scale": 0.82,
            },
        }).eq("id", generation_id).execute()

        logger.info(f"[{task_id}] ✅ {image_type} done → {final_url}")
        return {"status": "done", "image_url": final_url, "image_type": image_type}

    except Exception as e:
        logger.error(f"[{task_id}] ❌ {image_type} failed: {e}")
        try:
            sb.table("generated_images").update({
                "status": "failed",
                "error_message": str(e)[:500],
            }).eq("id", generation_id).execute()
        except Exception:
            pass
        raise
