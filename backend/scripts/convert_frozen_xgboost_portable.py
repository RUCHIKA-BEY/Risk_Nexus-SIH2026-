"""Convert frozen Colab XGBoost joblib bundles to portable runtime artifacts.

The original joblib stores an XGBoost memory snapshot that is not portable to
Windows. This script extracts the embedded UBJSON model and writes:
  - <model_id>_support.joblib: preprocessing, calibration and metadata
  - <model_id>.ubj: portable XGBoost booster

Original frozen files are read-only inputs and remain unchanged.

PROVENANCE ONLY: it refuses to run while the (frozen) portable artifacts exist.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import joblib
import xgboost as xgb
import xgboost.core as xgb_core

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
SOURCE_DIR = BACKEND_DIR / "artifacts" / "frozen_phase6_v1" / "models"
OUTPUT_DIR = BACKEND_DIR / "artifacts" / "portable_phase6_v1"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def extract_snapshot_bytes(path: Path) -> tuple[dict, bytes]:
    original_setstate = xgb_core.Booster.__setstate__

    def capture_state(booster, state):
        booster.__dict__.update(state)

    xgb_core.Booster.__setstate__ = capture_state
    try:
        bundle = joblib.load(path)
        snapshot = bytes(bundle["estimator"]._Booster.handle)
        # Prevent the temporary object destructor treating bytes as a C handle.
        bundle["estimator"]._Booster.__dict__.pop("handle", None)
    finally:
        xgb_core.Booster.__setstate__ = original_setstate
    return bundle, snapshot


def snapshot_to_portable_model(snapshot: bytes) -> bytes:
    model_key = b"L" + (5).to_bytes(8, "big") + b"Model"
    version_key = b"L" + (7).to_bytes(8, "big") + b"version"
    model_start = snapshot.index(model_key) + len(model_key)
    version_start = snapshot.rindex(version_key)

    # The snapshot has an outer {Config, Model, version} object. XGBoost's
    # portable loader accepts the embedded Model object followed by its version.
    embedded_model = snapshot[model_start:version_start]
    version_value = snapshot[version_start + len(version_key):-2]
    return embedded_model + version_key + version_value + b"}"


def convert(model_id: str) -> dict[str, str]:
    source_path = SOURCE_DIR / f"{model_id}.joblib"
    bundle, snapshot = extract_snapshot_bytes(source_path)
    portable_bytes = snapshot_to_portable_model(snapshot)

    booster = xgb.Booster()
    booster.load_model(bytearray(portable_bytes))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    booster_path = OUTPUT_DIR / f"{model_id}.ubj"
    booster.save_model(booster_path)

    support = {
        key: value
        for key, value in bundle.items()
        if key != "estimator"
    }
    support["artifact_format"] = "portable_xgboost_v1"
    support["estimator_params"] = bundle["estimator"].get_params()
    support_path = OUTPUT_DIR / f"{model_id}_support.joblib"
    joblib.dump(support, support_path)

    return {
        "model_id": model_id,
        "source_sha256": sha256(source_path),
        "support_path": str(support_path.relative_to(BACKEND_DIR)).replace("\\", "/"),
        "support_sha256": sha256(support_path),
        "booster_path": str(booster_path.relative_to(BACKEND_DIR)).replace("\\", "/"),
        "booster_sha256": sha256(booster_path),
        "boosted_rounds": str(booster.num_boosted_rounds()),
    }


def main() -> None:
    # PROVENANCE ONLY. The portable artifacts already exist and are hash-locked in
    # FROZEN_CHECKSUMS.sha256 and model_registry.json. Never regenerate them in the
    # integration repository.
    existing = sorted(OUTPUT_DIR.glob("*.ubj")) + sorted(OUTPUT_DIR.glob("*_support.joblib"))
    if existing and "--i-know-this-overwrites-frozen-artifacts" not in sys.argv:
        raise SystemExit(
            "REFUSING TO RUN: portable artifacts already exist in "
            f"{OUTPUT_DIR} and are frozen. This script is kept for provenance only."
        )
    records = [
        convert("cost_cuf_xgb"),
        convert("schedule_cuf_xgb"),
        convert("compound_cuf_xgb"),
    ]
    manifest_path = OUTPUT_DIR / "portable_manifest.json"
    manifest_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(json.dumps(records, indent=2))
    print(f"Portable artifacts written to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
