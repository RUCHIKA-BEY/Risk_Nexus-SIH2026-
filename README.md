# RiskNexus

**Project risk intelligence for India's central-sector infrastructure.**
Smart India Hackathon 2026 · Problem statement **SIH26103** (predictive and prescriptive infrastructure project monitoring)

RiskNexus forecasts which infrastructure projects are likely to face a **cost overrun**, a **schedule slippage**, or **both** in the next six months. It explains why each project is flagged, lets officials test what-if scenarios, and turns the results into a ranked review queue.

It is built on MoSPI's central-sector monthly monitoring data: **13,497 projects** and **65,047 monthly progress reports** from OCMS (2023–2025) and the PAIMANA portal (2025–2026).

```
DATA  →  RISK DETECTION  →  EXPLAINABILITY  →  SCENARIO SIMULATION  →  ACTION
```

![Executive dashboard](docs/screenshots/dashboard.png)

---

## Contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [The models](#the-models)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [API overview](#api-overview)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Limitations and responsible use](#limitations-and-responsible-use)
- [Team](#team)

---

## What it does

| Area | What an official can do |
|---|---|
| **Executive dashboard** | See portfolio KPIs: projects monitored, sanctioned cost, schedule-risk flags and active priority reviews. Drill into any project. |
| **Public dashboard** | Citizen-facing view of sector budgets vs expenditure, physical progress, and an interactive India map of project concentration by state. |
| **Risk assessment** | Pick an assessment month and score a project with three official models (cost, schedule, compound). Each score is shown against its alert threshold, with data-quality notes when inputs were missing. |
| **Risk drivers (SHAP)** | See which facts pushed each score up or down, computed exactly from the trained models. |
| **AI explanation** | A term-by-term brief that uses the project's own numbers: what each score means against the base rate, how each driver compares with similar projects, what to verify, and recommended checks. |
| **REX assistant** | Ask any question about a term, score or page. On a project page, REX answers with that project's figures. Every driver and section also has an (i) tooltip. |
| **What-if scenarios (FCM)** | Adjust pressures such as the physical progress gap or cost revisions and see how schedule pressure, cost pressure and intervention priority respond. |
| **Risk trajectory** | Month-by-month scores for a project, each computed only from data available at that time. |
| **Comparison and analytics** | Compare up to three projects side by side; view sector cost overruns, risk distribution, state-wise breakdowns (CSV/Excel export) and expenditure trends. |
| **Alerts and actions** | Risk alerts feed, and an operational priority queue ranked by risk and cut to the team's review capacity (top 10 / 25 / 50 / 100). |
| **Reports and diagnostics** | Audit reports for selected projects; system health and the active model registry. |

| Risk assessment | AI explanation | REX assistant |
|---|---|---|
| ![Risk assessment](docs/screenshots/risk-assessment.png) | ![AI explanation](docs/screenshots/ai-explanation.png) | ![REX assistant](docs/screenshots/rex-assistant.png) |

---

## How it works

```
 React + Vite dashboard
        │  /api/v1/*   (VITE_API_BASE_URL)
        ▼
 FastAPI backend ──────────────────────────────────────────────┐
   ├─ Model registry      routing + thresholds (frozen)        │
   ├─ 3 XGBoost models    official cost / schedule / compound  │  every file checked
   ├─ 3 LR models         benchmark only, never blended        │  against SHA-256
   ├─ TreeSHAP            exact per-project drivers            │  at startup
   ├─ FCM engine          expert-weighted what-if network      │
   ├─ AI explainer        Gemini, or rule-based fallback       │
   └─ Phase-6 dataset     13,497 projects · 65,047 rows ───────┘
```

- **The frontend never computes risk.** All scores, thresholds and explanations come from the backend.
- **Integrity first.** At startup the backend loads the model registry, then verifies every model file and the dataset against stored SHA-256 checksums. If anything has changed, it refuses to start. There is no silent fallback to demo data.
- **No look-ahead.** Every assessment uses only the data reported in or before the chosen month.
- **The AI is grounded.** The explainer receives only computed facts (values, peer medians and percentiles, base rates, SHAP drivers, FCM states, trend) plus a glossary of what every term means in this system. It is instructed never to invent values or claim causation.

---

## The models

Each model predicts an event within a **six-month window** after the assessment month. A project is flagged **HIGH** when its score reaches the threshold.

| Target | Model | Threshold | ROC-AUC | Recall | Precision |
|---|---|---|---|---|---|
| Cost overrun | `cost_cuf_xgb` (XGBoost) | 25 pts | 0.96 | 74% | 41% |
| Schedule slippage | `schedule_cuf_xgb` (XGBoost) | 20 pts | 0.83 | 82% | 35% |
| Compound (both) | `compound_cuf_xgb` (XGBoost) | 20 pts | 0.94 | 63% | 33% |

Validation scores at the alert threshold.

**Inputs:** 14 features per project-month, including original cost, cumulative expenditure and its ratio to the original cost, months relative to the original commissioning date, recent spending trends, counts of cost and schedule revisions, sector, and data-availability flags.

**Training protocol:**
- Split A training rows only. Five-fold stratified group cross-validation, grouped by project, so no project appears in both training and validation.
- Models selected on PR-AUC. Thresholds chosen by maximum F1.
- Sigmoid calibration fitted on validation scores.
- Three logistic regression models are kept as benchmarks only. The backend refuses to start if they are ever marked as official.

**Explainability:** exact TreeSHAP on the served booster, with an additivity check on every call.

**Scenarios:** a fuzzy cognitive map with 9 concepts and 16 expert-weighted links. It never changes the ML scores.

Full details: [`docs/MODEL_MANIFEST.md`](docs/MODEL_MANIFEST.md) and [`docs/INTEGRATION_LAYER.md`](docs/INTEGRATION_LAYER.md).

---

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 4, Recharts, D3-Geo, Lucide icons |
| Backend | Python 3.11–3.13, FastAPI, Uvicorn, Pydantic |
| ML | XGBoost 3.2.0, scikit-learn 1.6.1, pandas, NumPy, native TreeSHAP |
| AI | Google Gemini via the `google-genai` SDK (optional; rule-based fallback built in) |
| Data | Phase-6 canonical dataset (bundled locally, or downloaded once from Supabase Storage) |

---

## Getting started

### Prerequisites

- **Node.js** 20.19+ or 22.12+ (required by Vite 8)
- **Python** 3.11, 3.12 or 3.13 (3.10 and 3.14 are not supported)

### 1. Backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate            # Windows: use WSL (recommended)
pip install -r requirements-dev.txt  # runtime + test packages
cp .env.example .env                 # optional; defaults work as-is
uvicorn app.main:app --reload --port 8000
```

Check it is running:

- `http://localhost:8000/api/v1/health` returns `"models_loaded": true`
- Interactive API docs: `http://localhost:8000/docs`

### 2. Frontend

```bash
# from the repository root
npm install
npm run dev
```

Open `http://localhost:5173`. In development, Vite proxies `/api/*` to `http://localhost:8000`.

---

## Configuration

All backend settings are read from `backend/.env`. An empty or missing value always means "use the default". **Never commit `backend/.env`.** Only `.env.example` is tracked.

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | empty | Turns on Gemini for the AI explanation and REX. Without it, both use the rule-based explainer. Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). |
| `GEMINI_EXPLAINER_MODEL` | `gemini-flash-2.5` | Gemini model used by the AI explanation and REX. |
| `AI_TIMEOUT_SECONDS` | `45` | Timeout for each Gemini call. |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | CORS allow-list. Add your deployed frontend URL. |
| `CANONICAL_DATA_DIR` | `backend/data/phase6` | Folder containing the dataset. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, `SUPABASE_OBJECT_PATH` | empty | Download the dataset from Supabase Storage when it is not bundled. Server-side secrets only. |
| `ALLOW_DEMO_DATA` | `false` | Development-only 4-project fallback. Never use in production. |

Frontend: set `VITE_API_BASE_URL` (default `http://localhost:8000/api/v1`) to point at a deployed backend.

The full list is in [`INTEGRATION_README.md`](INTEGRATION_README.md).

---

## API overview

All endpoints are under `/api/v1`.

| Area | Endpoints |
|---|---|
| System | `GET /health` · `GET /models/status` · `GET /model-info` |
| Projects | `GET /projects` · `GET /projects/{id}` · `GET /projects/{id}/timeline` · `GET /projects/{id}/trajectory` · `GET /projects/{id}/assessment` · `GET /projects/{id}/actual-outcome` · `POST /projects/compare` |
| Portfolio | `GET /dashboard/metrics` · `GET /analytics/overview` · `GET /actions/priority-queue` |
| Predictions | `POST /predict/official` · `POST /predict/benchmark` |
| Risk layer | `POST /risk/predict` · `POST /risk/explain` · `POST /risk/fcm` · `POST /risk/assess` · `GET /fcm/graph` |
| Scenarios | `POST /simulate/fcm` |
| AI | `POST /ai/explain/deep` · `POST /ai/ask` · `GET /ai/glossary` · `POST /ai/explain` (legacy) |

---

## Testing

```bash
cd backend
python scripts/verify_frozen_artifacts.py   # expect: PASS, 0 problems
python scripts/verify_frozen_runtime.py     # expect: PASS for all three models
python -m pytest tests/ -q                  # expect: 179 passed
```

The suite checks that:
- the frozen model files, registry and dataset match their checksums;
- served predictions match the validated predictions on every validation row (to within 1e-9);
- SHAP explanations add up exactly to the model's output;
- the FCM is deterministic and can never alter an ML score;
- the AI explanation reports the same scores as the official models and falls back safely when Gemini is unavailable.

If `shap` is missing, install `requirements-dev.txt`.

---

## Project structure

```
├── src/
│   ├── pages/               Dashboard, Public Dashboard, Risk Assessment, Analytics, Actions, Reports …
│   ├── components/
│   │   ├── layout/          Sidebar, TopBanner, Footer
│   │   └── shared/          KPI cards, India map, AI explanation panel, REX assistant, term tooltips
│   ├── services/mlApi.js    single API client (uses VITE_API_BASE_URL)
│   └── assets/              India state geometry for the map
├── backend/
│   ├── app/
│   │   ├── routes/          health, projects, predictions, risk, simulations, ai, analytics, actions
│   │   ├── services/        models, registry, features, SHAP, FCM, AI context + explainer, dataset loading
│   │   ├── explainability/  TreeSHAP engine, feature labels, glossary
│   │   └── fcm/             concepts, weights (frozen), engine
│   ├── artifacts/           frozen model bundles and registry (do not modify)
│   ├── data/phase6/         canonical dataset (do not modify)
│   ├── scripts/             integrity and runtime checks
│   └── tests/               179 automated tests
└── docs/                    model manifest, integration layer, audit, FCM approval template
```

Files under `backend/artifacts/`, `backend/data/phase6/`, `backend/app/fcm/fcm_weights.json` and `backend/FROZEN_CHECKSUMS.sha256` are frozen. See [`INTEGRATION_README.md`](INTEGRATION_README.md) §16.

---

## Deployment

Planned production setup:

| Part | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Set `VITE_API_BASE_URL=https://risk-nexus-sih-2026.vercel.app` |
| Backend | Render | Start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`; add the Vercel URL to `ALLOWED_ORIGINS`; set `GEMINI_API_KEY` in Environment |
| Dataset | Bundled, or Supabase Storage | Integrity-checked against its SHA-256 on every startup |

---

## Limitations and responsible use

- **Scores support prioritisation, not decisions.** They estimate the chance of an event in the next six months and are not guarantees. Confirm with project documents before acting.
- **SHAP shows association, not cause.**
- **The FCM weights are an expert draft** awaiting domain approval (`DRAFT_NOT_DOMAIN_APPROVED`). Use scenario results as reasoning support only.
- **The schedule model flags widely** (about 38% of validation rows) by design. The priority queue ranks those flags to make them actionable.
- **Outcome labels** exist only for OCMS records with a complete six-month follow-up window. PAIMANA records can be scored but not back-tested.
- **Sign-in is a placeholder.** Government single sign-on (NIC / Parichay) is planned for a later release.
- **Data:** built from public MoSPI monitoring records. It contains no personal data.

---

## Team

Built for Smart India Hackathon 2026 by:

- Ruchika Patil
- Hemantha Raj M G
- Mohammad Arshad
- Rajveer Rai
- Rahul Yadav
- Mohammad Sazil


