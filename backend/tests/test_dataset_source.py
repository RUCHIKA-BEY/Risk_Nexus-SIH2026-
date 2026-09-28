"""
Canonical dataset sourcing: local file -> cache -> Supabase Storage download.

No network access: the real download code runs against an httpx.MockTransport.
Run from backend/:  python -m pytest tests/test_dataset_source.py -v
"""
from __future__ import annotations

import functools
import hashlib
from pathlib import Path

import httpx
import pytest

from app.config import CANONICAL_DATA_FILENAME, CANONICAL_DATA_PATH, CANONICAL_DATA_SHA256
from app.services import dataset_download, project_service

FAKE_KEY = "sb-secret-service-role-key-for-tests"
SUPABASE = {
    "SUPABASE_URL": "https://example-project.supabase.co",
    "SUPABASE_SERVICE_ROLE_KEY": FAKE_KEY,
    "SUPABASE_BUCKET": "RiskNexus",
    "SUPABASE_OBJECT_PATH": CANONICAL_DATA_FILENAME,
}
EXPECTED_URL = f"https://example-project.supabase.co/storage/v1/object/RiskNexus/{CANONICAL_DATA_FILENAME}"


@pytest.fixture(scope="module")
def canonical_bytes() -> bytes:
    data = CANONICAL_DATA_PATH.read_bytes()
    assert hashlib.sha256(data).hexdigest() == CANONICAL_DATA_SHA256
    return data


class FakeStorage:
    """Records requests and answers like Supabase Storage's authenticated object endpoint."""

    def __init__(self, body: bytes = b"", status: int = 200, headers: dict | None = None):
        self.body, self.status, self.headers = body, status, headers or {}
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if self.status != 200:
            return httpx.Response(self.status, json={"error": "denied", "message": "denied"})
        return httpx.Response(200, content=self.body, headers=self.headers)


@pytest.fixture
def env(monkeypatch, tmp_path):
    """Point the loader at an absent local file and an empty cache, with Supabase configured."""
    cache = tmp_path / "cache"
    monkeypatch.setattr(project_service, "CANONICAL_DATA_PATH", tmp_path / "absent" / CANONICAL_DATA_FILENAME)
    monkeypatch.setattr(project_service, "DATASET_CACHE_DIR", cache)
    monkeypatch.setattr(project_service, "ALLOW_DEMO_DATA", False)
    monkeypatch.setattr(project_service, "VERIFY_DATASET_SHA256", True)
    for name, value in SUPABASE.items():
        monkeypatch.setattr(project_service, name, value)

    def use(storage: FakeStorage) -> FakeStorage:
        client = httpx.Client(transport=httpx.MockTransport(storage))
        monkeypatch.setattr(
            project_service, "download_supabase_object",
            functools.partial(dataset_download.download_supabase_object, client=client),
        )
        return storage

    return {"cache": cache, "cached_file": cache / CANONICAL_DATA_FILENAME, "use": use}


def _no_partial_files(cache: Path) -> bool:
    return not cache.exists() or not any(p.name.endswith(".part") for p in cache.iterdir())


# ── Local file ────────────────────────────────────────────────────────────────

def test_local_file_is_used_without_download(env, monkeypatch):
    storage = env["use"](FakeStorage())
    monkeypatch.setattr(project_service, "CANONICAL_DATA_PATH", CANONICAL_DATA_PATH)
    path, source = project_service._resolve_canonical_dataset()
    assert (path, source) == (CANONICAL_DATA_PATH, "local")
    assert storage.requests == []


# ── Supabase download fallback ────────────────────────────────────────────────

def test_supabase_download_when_local_missing(env, canonical_bytes):
    storage = env["use"](FakeStorage(canonical_bytes))
    path, source = project_service._resolve_canonical_dataset()

    assert (path, source) == (env["cached_file"], "supabase")
    assert hashlib.sha256(path.read_bytes()).hexdigest() == CANONICAL_DATA_SHA256
    assert len(storage.requests) == 1
    req = storage.requests[0]
    assert req.method == "GET" and str(req.url) == EXPECTED_URL
    assert req.headers["authorization"] == f"Bearer {FAKE_KEY}"
    assert req.headers["apikey"] == FAKE_KEY
    assert _no_partial_files(env["cache"])


def test_full_startup_load_from_supabase(env, monkeypatch, canonical_bytes):
    """End to end: Supabase -> cache -> pandas loader -> all 13,497 projects indexed."""
    env["use"](FakeStorage(canonical_bytes))
    # Restore the session-wide loaded dataset after this test.
    for name in ("_full_df", "_summary_df", "_demo_manifest", "_demo_pids", "_dataset_info"):
        monkeypatch.setattr(project_service, name, getattr(project_service, name))

    project_service.load_demo_data()
    info = project_service.get_dataset_info()
    assert info["mode"] == "canonical" and info["source"] == "supabase"
    assert info["sha256_verified"] is True
    assert info["rows"] == 65047 and info["projects"] == 13497
    assert len(project_service.get_summary_df()) == 13497
    assert FAKE_KEY not in repr(info)


# ── Cache reuse ───────────────────────────────────────────────────────────────

def test_cache_is_reused_without_second_download(env, canonical_bytes):
    storage = env["use"](FakeStorage(canonical_bytes))
    assert project_service._resolve_canonical_dataset()[1] == "supabase"
    path, source = project_service._resolve_canonical_dataset()
    assert (path, source) == (env["cached_file"], "cache")
    assert len(storage.requests) == 1


def test_corrupt_cache_is_replaced(env, canonical_bytes):
    env["cache"].mkdir(parents=True)
    env["cached_file"].write_text("project_id,report_month\nX,2024-01-01\n")
    storage = env["use"](FakeStorage(canonical_bytes))
    path, source = project_service._resolve_canonical_dataset()
    assert source == "supabase" and len(storage.requests) == 1
    assert hashlib.sha256(path.read_bytes()).hexdigest() == CANONICAL_DATA_SHA256


# ── Missing credentials ───────────────────────────────────────────────────────

@pytest.mark.parametrize("missing", ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_BUCKET", "SUPABASE_OBJECT_PATH"])
def test_partial_supabase_config_fails_clearly(env, monkeypatch, missing):
    storage = env["use"](FakeStorage())
    monkeypatch.setattr(project_service, missing, "")
    with pytest.raises(project_service.DatasetConfigurationError, match=f"missing {missing}") as exc:
        project_service.load_demo_data()
    assert FAKE_KEY not in str(exc.value)
    assert storage.requests == []


def test_no_local_file_and_no_supabase_fails_clearly(env, monkeypatch):
    for name in SUPABASE:
        monkeypatch.setattr(project_service, name, "")
    with pytest.raises(project_service.DatasetConfigurationError, match="Canonical dataset not found") as exc:
        project_service.load_demo_data()
    assert "SUPABASE_SERVICE_ROLE_KEY" in str(exc.value)


# ── Download failures / invalid downloads ─────────────────────────────────────

@pytest.mark.parametrize("status", [400, 401, 403, 404, 500])
def test_http_error_fails_without_leaking_key(env, status):
    env["use"](FakeStorage(status=status))
    with pytest.raises(project_service.DatasetConfigurationError, match=f"HTTP {status}") as exc:
        project_service.load_demo_data()
    assert FAKE_KEY not in str(exc.value)
    assert not env["cached_file"].exists() and _no_partial_files(env["cache"])


def test_network_error_fails_without_leaking_key(env, monkeypatch):
    def boom(request):
        raise httpx.ConnectError(f"connection refused (key={FAKE_KEY})", request=request)
    env["use"](boom)
    with pytest.raises(project_service.DatasetConfigurationError, match="ConnectError") as exc:
        project_service.load_demo_data()
    assert FAKE_KEY not in str(exc.value)
    assert not env["cached_file"].exists() and _no_partial_files(env["cache"])


def test_wrong_file_fails_hash_check_and_is_not_cached(env):
    env["use"](FakeStorage(b"project_id,report_month\nX,2024-01-01\n"))
    with pytest.raises(project_service.DatasetConfigurationError, match="SHA-256"):
        project_service.load_demo_data()
    assert not env["cached_file"].exists() and _no_partial_files(env["cache"])


def test_empty_download_fails(env):
    env["use"](FakeStorage(b""))
    with pytest.raises(project_service.DatasetConfigurationError, match="empty"):
        project_service.load_demo_data()
    assert not env["cached_file"].exists()


def test_truncated_download_fails(env, canonical_bytes):
    env["use"](FakeStorage(canonical_bytes[:1000], headers={"content-length": str(len(canonical_bytes))}))
    with pytest.raises(project_service.DatasetConfigurationError):
        project_service.load_demo_data()
    assert not env["cached_file"].exists() and _no_partial_files(env["cache"])


def test_non_csv_download_rejected_when_hash_check_disabled(env, monkeypatch):
    monkeypatch.setattr(project_service, "VERIFY_DATASET_SHA256", False)
    env["use"](FakeStorage(b"<html>not a csv</html>"))
    with pytest.raises(project_service.DatasetConfigurationError, match="missing columns"):
        project_service.load_demo_data()
    assert not env["cached_file"].exists()


def test_object_url_is_encoded():
    url = dataset_download.storage_object_url("https://x.supabase.co/", "Risk Nexus", "/dir/a b.csv")
    assert url == "https://x.supabase.co/storage/v1/object/Risk%20Nexus/dir/a%20b.csv"
