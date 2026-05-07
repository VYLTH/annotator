"""
Image storage with two backends:
  - inline (BYTEA in DB) for shots ≤ 500 KB
  - R2 (Cloudflare R2 / S3-compatible) for larger shots

R2 is optional. If creds aren't set, large images fail with 413 (the widget
already caps at 5MB so this only affects extension full-page captures).

Uses boto3 only when R2 is actually configured — keeps the dep optional.
"""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Tuple

from .config import settings

logger = logging.getLogger(__name__)

INLINE_MAX = 500_000  # bytes; everything bigger goes to R2 if available

_s3_client = None


def r2_configured() -> bool:
    return bool(
        settings.r2_account_id
        and settings.r2_access_key
        and settings.r2_secret_key
        and settings.r2_bucket
    )


def _client():
    """Lazy boto3 client — only imports when R2 is actually used."""
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    try:
        import boto3  # type: ignore
        from botocore.config import Config  # type: ignore
    except ImportError as e:
        raise RuntimeError(
            "R2 storage requires the 'storage' extra: pip install 'vylth-annotator[storage]'"
        ) from e

    endpoint = f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"
    _s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.r2_access_key,
        aws_secret_access_key=settings.r2_secret_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )
    return _s3_client


def store(image_bytes: bytes, fb_id: str) -> Tuple[bytes | None, str | None]:
    """
    Decide where this image goes. Returns (inline_bytes, r2_key) — exactly one
    is non-None, except in the failure case where the caller should refuse the
    upload.
    """
    if len(image_bytes) <= INLINE_MAX:
        return image_bytes, None
    if not r2_configured():
        return None, None  # caller will 413
    key = f"feedback/{fb_id}.png"
    _client().put_object(
        Bucket=settings.r2_bucket,
        Key=key,
        Body=image_bytes,
        ContentType="image/png",
    )
    return None, key


def presigned_url(key: str, ttl_seconds: int = 600) -> str:
    """Sign a GET URL for an R2 object so we can redirect to it."""
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.r2_bucket, "Key": key},
        ExpiresIn=ttl_seconds,
    )
