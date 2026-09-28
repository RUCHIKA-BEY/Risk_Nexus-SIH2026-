"""Linux deployment smoke test for frozen scoring and native TreeSHAP."""
from __future__ import annotations

import sys
from pathlib import Path

import joblib
import pandas as pd
import sklearn
import xgboost

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.config import DEMO_DATA_DIR  # noqa: E402
from app.services.model_service import OFFICIAL_XGB_FEATURES, load_all_models, score_row  # noqa: E402
from app.services.registry_service import get_official_model_ids, load_registry  # noqa: E402
from app.services.shap_service import compute_shap  # noqa: E402


def main() -> None:
    print(
        "Runtime:",
        f"scikit-learn={sklearn.__version__}",
        f"xgboost={xgboost.__version__}",
        f"joblib={joblib.__version__}",
    )
    load_registry()
    load_all_models()

    demo_path = DEMO_DATA_DIR / "demo_rows.csv"
    if not demo_path.exists():
        raise FileNotFoundError(f"Demo row file not found: {demo_path}")
    row = pd.read_csv(demo_path).iloc[0].to_dict()
    feature_row = {name: row.get(name) for name in OFFICIAL_XGB_FEATURES}

    for model_id in get_official_model_ids():
        score = score_row(model_id, feature_row)
        positive, negative = compute_shap(
            model_id, feature_row, OFFICIAL_XGB_FEATURES, n_drivers=5
        )
        if not positive and not negative:
            raise AssertionError(f"No TreeSHAP drivers returned for {model_id}")
        print(
            f"PASS {model_id}: score={score:.6f}, "
            f"positive_drivers={len(positive)}, negative_drivers={len(negative)}"
        )

    print("PASS: frozen scoring and native TreeSHAP runtime verified")


if __name__ == "__main__":
    main()
