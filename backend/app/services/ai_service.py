"""
TaskHub — AI Service
Core product consistency pipeline:
  1. Background removal (rembg)
  2. GPT-4o product description extraction
  3. Fal.ai FLUX + IP-Adapter generation

This is the most critical module — it ensures all 8 images look consistent.
"""
from __future__ import annotations
import base64
import io
import os
import time
import logging
from typing import Optional
from PIL import Image
import fal_client
from openai import OpenAI
from rembg import remove
from ..config import settings

logger = logging.getLogger(__name__)

# ============================================================
# Image type → scene prompt mapping
# ============================================================
SCENE_PROMPTS: dict[str, dict] = {
    "white_bg": {
        "prompt": (
            "Professional e-commerce product photography. {product_descriptor} "
            "placed on a pure white background. Clean studio lighting from top-left, "
            "soft shadow beneath the product, sharp focus, no reflections, "
            "commercial photograph quality."
        ),
        "negative": "cluttered, busy background, low quality, blurry",
    },
    "theme_marble": {
        "prompt": (
            "Luxury editorial product photography. {product_descriptor} "
            "placed on an elegant white Carrara marble surface. "
            "Soft natural light streaming from left, gentle reflections on marble, "
            "cream and grey veining, elegant upscale atmosphere."
        ),
        "negative": "harsh shadows, dark, dirty, low quality",
    },
    "theme_velvet": {
        "prompt": (
            "High-fashion jewellery editorial photography. {product_descriptor} "
            "resting on a deep midnight navy velvet fabric background. "
            "Moody, atmospheric studio lighting, rich textures, luxury brand aesthetic, "
            "soft bokeh edges."
        ),
        "negative": "bright background, low quality, blurry, amateur",
    },
    "lifestyle_beach": {
        "prompt": (
            "Lifestyle product photography. {product_descriptor} "
            "placed on fine white sand at a tropical beach. "
            "Golden hour sunlight, gentle ocean waves blurred in background, "
            "warm tones, travel magazine aesthetic, natural lighting."
        ),
        "negative": "studio background, cold light, indoors",
    },
    "lifestyle_studio": {
        "prompt": (
            "Modern lifestyle product photography. {product_descriptor} "
            "displayed in a minimalist Scandinavian interior. "
            "Soft natural window light, light oak wood surface, "
            "small green plants softly blurred in background, "
            "calm and aspirational home atmosphere."
        ),
        "negative": "cluttered, busy, dark, outdoors",
    },
    "model_front": {
        "prompt": (
            "Professional fashion photography, full frontal portrait. "
            "A beautiful model wearing or holding {product_descriptor}. "
            "Clean white studio backdrop, professional softbox lighting, "
            "sharp product focus, commercial fashion campaign aesthetic."
        ),
        "negative": "blurry product, harsh shadows, amateur, low quality",
    },
    "model_side": {
        "prompt": (
            "Professional fashion photography, 45-degree side angle. "
            "A beautiful model wearing or holding {product_descriptor}. "
            "Studio backdrop, professional lighting setup, "
            "elegant pose, product clearly visible, catalogue photography."
        ),
        "negative": "blurry, low quality, wrong angle, face hidden",
    },
    "model_closeup": {
        "prompt": (
            "Professional close-up fashion photography. "
            "Extreme close-up detail shot of a model wearing {product_descriptor}. "
            "Macro lens, beautiful soft bokeh background, "
            "skin texture visible, product crystal clear, beauty editorial quality."
        ),
        "negative": "full body, wide angle, blurry product",
    },
}


# ============================================================
# 1. Background Removal
# ============================================================
def remove_background(image_bytes: bytes) -> bytes:
    """Remove background from product image using rembg. Returns PNG bytes."""
    try:
        input_image = Image.open(io.BytesIO(image_bytes))
        output_image = remove(input_image)
        output_buffer = io.BytesIO()
        output_image.save(output_buffer, format="PNG")
        return output_buffer.getvalue()
    except Exception as e:
        logger.error(f"Background removal failed: {e}")
        raise


# ============================================================
# 2. GPT-4o Product Description
# ============================================================
def extract_product_descriptor(image_bytes: bytes, image_mime: str = "image/jpeg") -> str:
    """
    Use GPT-4o to generate a rich, detailed product description.
    This description is injected into all 8 prompts for consistency.
    """
    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        b64_image = base64.b64encode(image_bytes).decode("utf-8")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a product photography expert. Your job is to describe "
                        "a product image in precise, detailed terms for use in AI image generation prompts. "
                        "Focus on: product type, material, color, shape, size, texture, finish, "
                        "distinguishing features, and style. Be specific and concise (2-3 sentences max). "
                        "Start with the product type. Example: 'a delicate pearl drop earring with 18k gold hardware, "
                        "lustrous 8mm freshwater pearls, elegant teardrop shape with tiny diamond accent'"
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{image_mime};base64,{b64_image}",
                                "detail": "high",
                            },
                        },
                        {
                            "type": "text",
                            "text": "Describe this product for AI image generation:",
                        },
                    ],
                },
            ],
            max_tokens=150,
            temperature=0.3,
        )

        descriptor = response.choices[0].message.content.strip()
        logger.info(f"GPT-4o product descriptor: {descriptor}")
        return descriptor

    except Exception as e:
        logger.error(f"GPT-4o extraction failed: {e}")
        return "a beautiful jewelry product with elegant design and premium finish"


# ============================================================
# 3. Fal.ai FLUX + IP-Adapter Generation
# ============================================================
def generate_with_fal(
    product_image_url: str,
    product_descriptor: str,
    image_type: str,
    seed: int,
) -> str:
    """
    Generate a product image using Fal.ai FLUX with IP-Adapter for consistency.
    Returns the URL of the generated image.
    """
    os.environ["FAL_KEY"] = settings.FAL_KEY

    scene_config = SCENE_PROMPTS.get(image_type, SCENE_PROMPTS["white_bg"])
    final_prompt = scene_config["prompt"].format(product_descriptor=product_descriptor)
    negative_prompt = scene_config["negative"]

    # Model-wearing shots need more detail in the prompt
    if image_type.startswith("model_"):
        final_prompt = (
            f"8k ultra-realistic professional fashion photography, "
            f"{final_prompt}, "
            f"magazine editorial quality, perfect lighting, sharp focus on product"
        )
    else:
        final_prompt = (
            f"8k professional product photography, {final_prompt}, "
            f"award-winning commercial photograph"
        )

    logger.info(f"Fal.ai generating [{image_type}] with seed {seed}")
    logger.info(f"Prompt: {final_prompt[:120]}...")

    try:
        result = fal_client.run(
            "fal-ai/flux-general",
            arguments={
                "prompt": final_prompt,
                "negative_prompt": negative_prompt,
                "image_size": "square_hd",  # 1024×1024
                "num_inference_steps": 28,
                "guidance_scale": 7.5,
                "seed": seed,
                "num_images": 1,
                "enable_safety_checker": False,
                "ip_adapters": [
                    {
                        "path": "h94/IP-Adapter",
                        "image_url": product_image_url,
                        "scale": 0.82,
                    }
                ],
            },
        )

        images = result.get("images", [])
        if not images:
            raise ValueError("Fal.ai returned no images")

        generated_url = images[0]["url"]
        logger.info(f"Generated image URL: {generated_url}")
        return generated_url

    except Exception as e:
        logger.error(f"Fal.ai generation failed for {image_type}: {e}")
        raise


# ============================================================
# Master function used by RQ worker
# ============================================================
def run_generation_pipeline(
    task_id: str,
    generation_id: str,
    image_type: str,
    product_image_url: str,
    product_image_removed_bg_url: str,
    product_descriptor: str,
    seed: int,
) -> dict:
    """
    Full pipeline for one image type:
    1. Use bg-removed image as IP-Adapter reference
    2. Build scene prompt
    3. Call Fal.ai
    4. Return result URL
    """
    reference_image_url = product_image_removed_bg_url or product_image_url

    generated_url = generate_with_fal(
        product_image_url=reference_image_url,
        product_descriptor=product_descriptor,
        image_type=image_type,
        seed=seed,
    )

    return {
        "generation_id": generation_id,
        "image_type": image_type,
        "image_url": generated_url,
        "seed": seed,
    }
