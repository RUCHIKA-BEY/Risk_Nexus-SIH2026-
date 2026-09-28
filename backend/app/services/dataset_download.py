"""
Download the canonical dataset from Supabase Storage into a local cache.

Called once at startup by project_service.load_demo_data() only when the local
canonical CSV is absent. The object is streamed to a temporary file in the
cache directory, verified (HTTP status, size, CSV header, SHA-256), and only
then atomically renamed into place, so a partial or invalid download can never
be mistaken for a good cache entry.

The service-role key is sent only in request headers. It is never logged, and
it is redacted from every error message raised here.
"""
from __future__ import annotations

import hashlib
import logging
import os
import tempfile
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

REQUIRED_CSV_COLUMNS = ("project_id", "report_month")


class DatasetDownloadError(RuntimeError):
    """The dataset could not be downloaded or the downloaded file is invalid."""


def _redact(text: str, secret: str) -> str:
    return text.replace(secret, "***") if secret else text


def storage_object_url(supabase_url: str, bucket: str, object_path: str) -> str:
    """Authenticated Storage download URL: {url}/storage/v1/object/{bucket}/{path}."""
    return (
        f"{supabase_url.rstrip('/')}/storage/v1/object/"
        f"{quote(bucket, safe='')}/{quote(object_path.lstrip('/'), safe='/')}"
    )


def _check_csv_header(path: Path) -> None:
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        header = f.readline().strip().lstrip("﻿")
    columns = {c.strip().strip('"') for c in header.split(",")}
    missing = [c for c in REQUIRED_CSV_COLUMNS if c not in columns]
    if missing:
        raise DatasetDownloadError(
            f"Downloaded file is not the canonical dataset CSV (missing columns: {', '.join(missing)})."
        )


def download_supabase_object(
    *,
    supabase_url: str,
    service_role_key: str,
    bucket: str,
    object_path: str,
    destination: Path,
    expected_sha256: Optional[str],
    timeout_seconds: float = 120.0,
    client: Optional[httpx.Client] = None,
) -> str:
    """
    Stream a private Storage object to ``destination`` atomically.

    Returns the SHA-256 of the file. Raises DatasetDownloadError on any HTTP
    or network failure, an empty body, a truncated body, a non-CSV body, or
    (when ``expected_sha256`` is given) a hash mismatch. On failure nothing is
    left at ``destination`` or in the cache directory.
    """
    url = storage_object_url(supabase_url, bucket, object_path)
    headers = {"Authorization": f"Bearer {service_role_key}", "apikey": service_role_key}
    destination.parent.mkdir(parents=True, exist_ok=True)

    fd, tmp_name = tempfile.mkstemp(prefix=f".{destination.name}.", suffix=".part", dir=destination.parent)
    tmp_path = Path(tmp_name)
    own_client = client is None
    http = client or httpx.Client(timeout=httpx.Timeout(timeout_seconds), follow_redirects=True)
    try:
        logger.info("Downloading canonical dataset from Supabase Storage (bucket=%s, object=%s) ...", bucket, object_path)
        sha = hashlib.sha256()
        written = 0
        with os.fdopen(fd, "wb") as out:
            with http.stream("GET", url, headers=headers) as resp:
                if resp.status_code != 200:
                    raise DatasetDownloadError(
                        f"Supabase Storage returned HTTP {resp.status_code} for bucket '{bucket}', "
                        f"object '{object_path}'. Check SUPABASE_URL, SUPABASE_BUCKET, "
                        "SUPABASE_OBJECT_PATH and SUPABASE_SERVICE_ROLE_KEY."
                    )
                expected_len = resp.headers.get("content-length")
                for chunk in resp.iter_bytes(1 << 20):
                    out.write(chunk)
                    sha.update(chunk)
                    written += len(chunk)
            out.flush()
            os.fsync(out.fileno())

        if written == 0:
            raise DatasetDownloadError("Supabase Storage returned an empty file.")
        if expected_len is not None and expected_len.isdigit() and int(expected_len) != written:
            raise DatasetDownloadError(
                f"Download incomplete: received {written} of {expected_len} bytes."
            )
        digest = sha.hexdigest()
        if expected_sha256 and digest != expected_sha256:
            raise DatasetDownloadError(
                f"Downloaded dataset has SHA-256 {digest}, expected {expected_sha256}. "
                "The object in Supabase is not the frozen Phase 6 file."
            )
        _check_csv_header(tmp_path)

        os.replace(tmp_path, destination)  # atomic on the same filesystem
        logger.info("Canonical dataset cached at %s (%d bytes, sha256=%s)", destination, written, digest)
        return digest
    except DatasetDownloadError:
        raise
    except httpx.HTTPError as e:
        raise DatasetDownloadError(
            _redact(f"Supabase Storage download failed ({type(e).__name__}): {e}", service_role_key)
        ) from None
    except OSError as e:
        raise DatasetDownloadError(
            _redact(f"Could not write the dataset cache at {destination.parent}: {e}", service_role_key)
        ) from None
    finally:
        if own_client:
            http.close()
        tmp_path.unlink(missing_ok=True)
