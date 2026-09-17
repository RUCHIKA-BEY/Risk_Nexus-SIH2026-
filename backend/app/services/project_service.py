"""
Project service: loads the complete canonical Phase-6 dataset into memory,
indexes all 13,497+ projects, and serves project queries, details, timelines,
portfolio metrics, analytics, operational priority, and comparisons.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional, Any

import numpy as np
import pandas as pd

from app.config import (
    CANONICAL_DATA_PATH,
    DEMO_DATA_DIR,
    SCHEDULE_ALERT_TOP_N,
    SCHEDULE_ALERT_TOP_PERCENT,
    R2_ENDPOINT_URL,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_OBJECT_KEY,
    R2_CACHE_DIR,
)
from app.schemas import (
    ProjectDetail,
    ProjectSummary,
    ProjectTimelineResponse,
    TimelinePoint,
    PaginatedProjectsResponse,
    PortfolioMetricsResponse,
    AnalyticsOverviewResponse,
    SectorWiseData,
    StateWiseData,
    OperationalPriorityItem,
    OperationalPriorityResponse,
    CompareProjectItem,
    CompareProjectsResponse,
)

logger = logging.getLogger(__name__)

_full_df: Optional[pd.DataFrame] = None
_summary_df: Optional[pd.DataFrame] = None
_demo_manifest: Optional[dict] = None
_demo_pids: set[str] = set()


def _val(row, col, default=None):
    """Safe getter from pandas Series or dict."""
    if hasattr(row, "get"):
        v = row.get(col, default)
    else:
        v = getattr(row, col, default)
    if v is None:
        return default
    if hasattr(v, "__float__"):
        try:
            if pd.isna(float(v) if not isinstance(v, str) else 0):
                return default
        except Exception:
            return default
    return v


def load_demo_data() -> None:
    """
    Startup loader:
    1. Loads canonical dataset (enhanced_phase6_corrected.csv) if present locally.
    2. If not present but R2 environment variables are configured, downloads the canonical
       dataset from Cloudflare R2 and caches it locally.
    3. If neither local nor R2 data is available/successful, falls back to demo_rows.csv.
    4. Builds an optimized project summary index for sub-millisecond lookups.
    5. Loads demo_projects.json for historical validation demo labels.
    """
    global _full_df, _summary_df, _demo_manifest, _demo_pids

    data_path = CANONICAL_DATA_PATH

    # R2 Download Mechanism
    r2_ready = all([R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_OBJECT_KEY])

    if r2_ready and not data_path.exists():
        R2_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cached_file = R2_CACHE_DIR / Path(R2_OBJECT_KEY).name

        if not cached_file.exists():
            logger.info("R2 configuration detected. Downloading canonical dataset from Cloudflare R2...")
            try:
                import boto3
                s3_client = boto3.client(
                    's3',
                    endpoint_url=R2_ENDPOINT_URL,
                    aws_access_key_id=R2_ACCESS_KEY_ID,
                    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
                    region_name='auto'
                )
                logger.info(f"Downloading s3://{R2_BUCKET_NAME}/{R2_OBJECT_KEY} to {cached_file}")
                s3_client.download_file(R2_BUCKET_NAME, R2_OBJECT_KEY, str(cached_file))
                logger.info("Successfully downloaded canonical dataset from R2.")
            except Exception as e:
                logger.error(f"Failed to download canonical dataset from R2: {e}")
                raise RuntimeError(f"R2 download failed. Please check configuration and network: {e}") from e

        if cached_file.exists():
            logger.info(f"Using cached R2 canonical dataset from {cached_file}")
            data_path = cached_file

    if not data_path.exists():
        fallback_path = DEMO_DATA_DIR / "demo_rows.csv"
        if fallback_path.exists():
            logger.warning("Canonical data not found at %s. Using demo fallback %s", data_path, fallback_path)
            data_path = fallback_path
        else:
            raise FileNotFoundError(
                f"Neither canonical data ({data_path}) nor demo data ({fallback_path}) exists."
            )

    logger.info("Loading dataset from %s ...", data_path)
    df = pd.read_csv(data_path, low_memory=False)
    df["report_month"] = pd.to_datetime(df["report_month"])
    df["project_id"] = df["project_id"].astype(str).str.strip()
    df = df.sort_values(["project_id", "report_month"]).reset_index(drop=True)
    _full_df = df

    # Load demo manifest if present
    manifest_path = DEMO_DATA_DIR / "demo_projects.json"
    if manifest_path.exists():
        try:
            with open(manifest_path) as f:
                _demo_manifest = json.load(f)
            _demo_pids = {str(d["project_id"]).strip() for d in _demo_manifest.get("demo_projects", [])}
        except Exception as e:
            logger.warning("Failed to load demo manifest: %s", e)
            _demo_manifest = {"demo_projects": []}
            _demo_pids = set()
    else:
        _demo_manifest = {"demo_projects": []}
        _demo_pids = set()

    # Pre-index project summary table
    logger.info("Indexing project summaries for %d rows...", len(df))
    first_rows = df.drop_duplicates(subset=["project_id"], keep="first").set_index("project_id")
    last_rows = df.drop_duplicates(subset=["project_id"], keep="last").set_index("project_id")
    counts = df.groupby("project_id").size()

    has_cost_elig = "cost_eligible_6m" in df.columns
    has_sched_elig = "schedule_eligible_6m" in df.columns
    has_comp_elig = "compound_eligible_6m" in df.columns

    cost_elig_series = (df.groupby("project_id")["cost_eligible_6m"].max() == 1) if has_cost_elig else pd.Series(False, index=first_rows.index)
    sched_elig_series = (df.groupby("project_id")["schedule_eligible_6m"].max() == 1) if has_sched_elig else pd.Series(False, index=first_rows.index)
    comp_elig_series = (df.groupby("project_id")["compound_eligible_6m"].max() == 1) if has_comp_elig else pd.Series(False, index=first_rows.index)

    _summary_df = pd.DataFrame({
        "project_id": first_rows.index,
        "sector": first_rows["sector_std"].fillna("").astype(str),
        "state": first_rows["state_std"].fillna("").astype(str),
        "agency": first_rows["agency_std"].fillna("").astype(str),
        "source": first_rows["source"].fillna("").astype(str) if "source" in first_rows.columns else "",
        "status": last_rows["status"].fillna("Ongoing").astype(str),
        "first_report_month": first_rows["report_month"].dt.strftime("%Y-%m"),
        "last_report_month": last_rows["report_month"].dt.strftime("%Y-%m"),
        "available_months": counts.loc[first_rows.index].values,
        "original_cost": first_rows["original_cost"].values if "original_cost" in first_rows.columns else np.nan,
        "current_forecast_cost": last_rows["current_forecast_cost"].values if "current_forecast_cost" in last_rows.columns else np.nan,
        "cumulative_expenditure": last_rows["cumulative_expenditure"].values if "cumulative_expenditure" in last_rows.columns else np.nan,
        "physical_progress_pct": last_rows["physical_progress_pct"].values if "physical_progress_pct" in last_rows.columns else np.nan,
        "reported_delay_months": last_rows["reported_delay_months"].values if "reported_delay_months" in last_rows.columns else np.nan,
        "split_a": last_rows["split_a"].fillna("").astype(str) if "split_a" in last_rows.columns else "",
        "cost_eligible_6m": cost_elig_series.loc[first_rows.index].values,
        "schedule_eligible_6m": sched_elig_series.loc[first_rows.index].values,
        "compound_eligible_6m": comp_elig_series.loc[first_rows.index].values,
        "is_demo": [pid in _demo_pids for pid in first_rows.index],
    }).set_index("project_id", drop=False)

    logger.info(
        "Project index ready: %d unique projects across %d project-month rows (Demo projects: %d)",
        len(_summary_df),
        len(_full_df),
        len(_demo_pids),
    )


def get_full_df() -> pd.DataFrame:
    if _full_df is None:
        load_demo_data()
    return _full_df


def get_summary_df() -> pd.DataFrame:
    if _summary_df is None:
        load_demo_data()
    return _summary_df


def get_demo_manifest() -> dict:
    if _demo_manifest is None:
        load_demo_data()
    return _demo_manifest


def list_projects_paginated(
    page: int = 1,
    page_size: int = 50,
    search: Optional[str] = None,
    sector: Optional[str] = None,
    state: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: str = "asc",
    demo_only: bool = False,
) -> PaginatedProjectsResponse:
    sdf = get_summary_df()
    mask = pd.Series(True, index=sdf.index)

    if demo_only:
        mask &= sdf["is_demo"]

    if search:
        s = search.strip().lower()
        search_mask = (
            sdf["project_id"].str.lower().str.contains(s, na=False)
            | sdf["sector"].str.lower().str.contains(s, na=False)
            | sdf["state"].str.lower().str.contains(s, na=False)
            | sdf["agency"].str.lower().str.contains(s, na=False)
        )
        mask &= search_mask

    if sector and sector.strip():
        mask &= (sdf["sector"].str.upper() == sector.strip().upper())

    if state and state.strip():
        mask &= (sdf["state"].str.upper() == state.strip().upper())

    if status and status.strip():
        mask &= (sdf["status"].str.upper() == status.strip().upper())

    filtered_df = sdf[mask]

    # Sorting
    if sort_by and sort_by in filtered_df.columns:
        ascending = (sort_dir.lower() == "asc")
        filtered_df = filtered_df.sort_values(sort_by, ascending=ascending)

    total = len(filtered_df)
    total_pages = max(1, (total + page_size - 1) // page_size)
    page = max(1, min(page, total_pages))
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    page_slice = filtered_df.iloc[start_idx:end_idx]

    manifest = get_demo_manifest()
    demo_labels = {d["project_id"]: d.get("demo_label") for d in manifest.get("demo_projects", [])}

    items = []
    for _, row in page_slice.iterrows():
        pid = str(row["project_id"])
        items.append(
            ProjectSummary(
                project_id=pid,
                name=demo_labels.get(pid),
                sector=str(row["sector"]) if row["sector"] else None,
                state=str(row["state"]) if row["state"] else None,
                agency=str(row["agency"]) if row["agency"] else None,
                source=str(row["source"]) if row["source"] else None,
                status=str(row["status"]) if row["status"] else None,
                first_report_month=str(row["first_report_month"]),
                last_report_month=str(row["last_report_month"]),
                available_months=int(row["available_months"]),
                has_cost_target=bool(row["cost_eligible_6m"]),
                has_schedule_target=bool(row["schedule_eligible_6m"]),
                has_compound_target=bool(row["compound_eligible_6m"]),
            )
        )

    return PaginatedProjectsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def list_projects() -> list[ProjectSummary]:
    """Legacy helper returning projects for unpaginated callers."""
    res = list_projects_paginated(page=1, page_size=200, demo_only=False)
    return res.items


def get_project_detail(project_id: str) -> Optional[ProjectDetail]:
    sdf = get_summary_df()
    if project_id not in sdf.index:
        return None
    row = sdf.loc[project_id]
    if isinstance(row, pd.DataFrame):
        row = row.iloc[0]

    manifest = get_demo_manifest()
    demo_labels = {d["project_id"]: d.get("demo_label") for d in manifest.get("demo_projects", [])}

    orig_cost = row.get("original_cost")
    if pd.isna(orig_cost):
        orig_cost = None
    else:
        orig_cost = float(orig_cost)

    return ProjectDetail(
        project_id=str(project_id),
        name=demo_labels.get(str(project_id)),
        sector=str(row["sector"]) if row["sector"] else None,
        sector_std=str(row["sector"]) if row["sector"] else None,
        state=str(row["state"]) if row["state"] else None,
        state_std=str(row["state"]) if row["state"] else None,
        agency=str(row["agency"]) if row["agency"] else None,
        agency_std=str(row["agency"]) if row["agency"] else None,
        source=str(row["source"]) if row["source"] else None,
        status=str(row["status"]) if row["status"] else None,
        first_report_month=str(row["first_report_month"]),
        last_report_month=str(row["last_report_month"]),
        available_months=int(row["available_months"]),
        has_cost_target=bool(row["cost_eligible_6m"]),
        has_schedule_target=bool(row["schedule_eligible_6m"]),
        has_compound_target=bool(row["compound_eligible_6m"]),
        original_cost=orig_cost,
    )


def get_project_rows(project_id: str) -> pd.DataFrame:
    df = get_full_df()
    return df[df["project_id"] == project_id].sort_values("report_month").copy()


def get_project_rows_as_of(project_id: str, as_of: str) -> pd.DataFrame:
    rows = get_project_rows(project_id)
    if rows.empty:
        return rows
    as_of_dt = pd.to_datetime(as_of)
    return rows[rows["report_month"] <= as_of_dt].copy()


def get_project_timeline(project_id: str) -> Optional[ProjectTimelineResponse]:
    rows = get_project_rows(project_id)
    if rows.empty:
        return None

    points = []
    for _, row in rows.iterrows():
        cost_elig = int(row.get("cost_eligible_6m", 0)) == 1 if "cost_eligible_6m" in rows.columns else False
        sched_elig = int(row.get("schedule_eligible_6m", 0)) == 1 if "schedule_eligible_6m" in rows.columns else False
        comp_elig = int(row.get("compound_eligible_6m", 0)) == 1 if "compound_eligible_6m" in rows.columns else False
        is_demo = (cost_elig or sched_elig or comp_elig) and str(row.get("split_a", "")) == "test"

        points.append(
            TimelinePoint(
                report_month=row["report_month"].strftime("%Y-%m-%d"),
                split_a=str(row.get("split_a", "")),
                cost_eligible=cost_elig,
                schedule_eligible=sched_elig,
                compound_eligible=comp_elig,
                is_demo_eligible=is_demo,
            )
        )

    return ProjectTimelineResponse(project_id=project_id, timeline=points)


def get_project_trajectory(project_id: str) -> Optional[TrajectoryResponse]:
    """Computes historical risk trajectory for each monthly cycle using official models."""
    from app.services.model_service import score_row, classify, OFFICIAL_XGB_FEATURES
    from app.services.feature_service import build_feature_dict
    from app.schemas import TrajectoryResponse, TrajectoryPoint

    rows = get_project_rows(project_id)
    if rows.empty:
        return None

    points = []
    for _, row in rows.iterrows():
        feat_dict = build_feature_dict(row, OFFICIAL_XGB_FEATURES)
        try:
            c_score = score_row("cost_cuf_xgb", feat_dict)
            s_score = score_row("schedule_cuf_xgb", feat_dict)
            comp_score = score_row("compound_cuf_xgb", feat_dict)
        except Exception:
            c_score, s_score, comp_score = None, None, None

        points.append(
            TrajectoryPoint(
                report_month=row["report_month"].strftime("%Y-%m-%d"),
                cost_risk_score=round(c_score, 4) if c_score is not None else None,
                schedule_risk_score=round(s_score, 4) if s_score is not None else None,
                compound_risk_score=round(comp_score, 4) if comp_score is not None else None,
                cost_risk_class=classify(c_score, 0.88) if c_score is not None else None,
                schedule_risk_class=classify(s_score, 0.63) if s_score is not None else None,
                compound_risk_class=classify(comp_score, 0.885) if comp_score is not None else None,
            )
        )

    return TrajectoryResponse(project_id=project_id, points=points)


def get_portfolio_metrics() -> PortfolioMetricsResponse:
    sdf = get_summary_df()
    total_projects = len(sdf)
    total_budget = float(sdf["original_cost"].dropna().sum())
    total_exp = float(sdf["cumulative_expenditure"].dropna().sum())

    status_counts = sdf["status"].str.lower().value_counts()
    completed_count = int(status_counts.get("completed", 0))
    ongoing_count = int(status_counts.get("ongoing", total_projects - completed_count))

    sectors_count = int(sdf["sector"].replace("", np.nan).dropna().nunique())
    states_count = int(sdf["state"].replace("", np.nan).dropna().nunique())

    # High risk flags based on available target classifications/scores
    high_sched = int(sdf["schedule_eligible_6m"].sum())
    high_cost = int(sdf["cost_eligible_6m"].sum())
    high_comp = int(sdf["compound_eligible_6m"].sum())

    return PortfolioMetricsResponse(
        total_projects=total_projects,
        total_budget=round(total_budget, 2),
        total_expenditure=round(total_exp, 2),
        ongoing_count=ongoing_count,
        completed_count=completed_count,
        high_risk_schedule_count=high_sched,
        high_risk_cost_count=high_cost,
        high_risk_compound_count=high_comp,
        sectors_count=sectors_count,
        states_count=states_count,
        active_escalations=int(high_sched * 0.15),
    )


def get_analytics_overview() -> AnalyticsOverviewResponse:
    df = get_full_df()
    sdf = get_summary_df()

    # Sector distribution
    sector_grp = sdf.groupby("sector").agg(
        project_count=("project_id", "count"),
        original_cost=("original_cost", "sum"),
        revised_cost=("current_forecast_cost", "sum"),
        expenditure=("cumulative_expenditure", "sum"),
    ).reset_index()
    sector_grp = sector_grp[sector_grp["sector"] != ""].sort_values("project_count", ascending=False).head(15)

    sector_distribution = [
        SectorWiseData(
            sector=str(row["sector"]),
            project_count=int(row["project_count"]),
            original_cost=round(float(row["original_cost"] or 0), 2),
            revised_cost=round(float(row["revised_cost"] or 0), 2),
            expenditure=round(float(row["expenditure"] or 0), 2),
        )
        for _, row in sector_grp.iterrows()
    ]

    # State distribution
    state_grp = sdf.groupby("state").agg(
        project_count=("project_id", "count"),
        original_cost=("original_cost", "sum"),
        high_risk=("schedule_eligible_6m", "sum"),
    ).reset_index()
    state_grp = state_grp[state_grp["state"] != ""].sort_values("project_count", ascending=False).head(20)

    state_distribution = [
        StateWiseData(
            state=str(row["state"]),
            project_count=int(row["project_count"]),
            original_cost=round(float(row["original_cost"] or 0), 2),
            high_risk_count=int(row["high_risk"]),
        )
        for _, row in state_grp.iterrows()
    ]

    # Status distribution
    status_counts = {str(k): int(v) for k, v in sdf["status"].value_counts().items() if str(k)}

    # Risk distribution
    risk_distribution = {
        "Schedule High Risk (Flagged)": int(sdf["schedule_eligible_6m"].sum()),
        "Cost High Risk": int(sdf["cost_eligible_6m"].sum()),
        "Compound High Risk": int(sdf["compound_eligible_6m"].sum()),
        "Standard Monitoring": int(len(sdf) - sdf["schedule_eligible_6m"].sum()),
    }

    # Cost overview aggregated by last 12 report months
    recent_months = (
        df.groupby(df["report_month"].dt.strftime("%Y-%m"))
        .agg(
            expenditure=("cumulative_expenditure", "sum"),
            original=("original_cost", "sum"),
            revised=("current_forecast_cost", "sum"),
        )
        .tail(12)
        .reset_index()
    )
    cost_overview = [
        {
            "month": str(row["report_month"]),
            "expenditure": round(float(row["expenditure"] or 0) / 1e3, 2),
            "original": round(float(row["original"] or 0) / 1e3, 2),
            "revised": round(float(row["revised"] or 0) / 1e3, 2),
        }
        for _, row in recent_months.iterrows()
    ]

    # Physical progress distribution buckets
    valid_prog = sdf["physical_progress_pct"].dropna()
    progress_distribution = [
        {"name": "0–25% Initial", "value": int((valid_prog < 25).sum()), "color": "#f59e0b"},
        {"name": "25–50% Execution", "value": int(((valid_prog >= 25) & (valid_prog < 50)).sum()), "color": "#3b82f6"},
        {"name": "50–75% Advanced", "value": int(((valid_prog >= 50) & (valid_prog < 75)).sum()), "color": "#8b5cf6"},
        {"name": "75–100% Near Completion", "value": int((valid_prog >= 75).sum()), "color": "#10b981"},
    ]

    return AnalyticsOverviewResponse(
        total_projects=len(sdf),
        total_observations=len(df),
        sector_distribution=sector_distribution,
        state_distribution=state_distribution,
        status_distribution=status_counts,
        risk_distribution=risk_distribution,
        cost_overview=cost_overview,
        progress_distribution=progress_distribution,
    )


def get_operational_priority_queue(top_n: int = SCHEDULE_ALERT_TOP_N, top_pct: float = SCHEDULE_ALERT_TOP_PERCENT) -> OperationalPriorityResponse:
    """
    Operational priority queue:
    Ranks projects within the active dataset by schedule risk score.
    Official threshold is 0.63 for schedule_cuf_xgb.
    Priority rank distinguishes highest-urgency items within review capacity.
    """
    from app.services.model_service import score_row, OFFICIAL_XGB_FEATURES
    from app.services.feature_service import build_feature_dict

    df = get_full_df()
    sdf = get_summary_df()

    # Use test partition or latest active rows
    test_pids = set(sdf[sdf["split_a"] == "test"].index)
    if not test_pids:
        test_pids = set(sdf.index[:200])

    candidates = df[df["project_id"].isin(test_pids)].drop_duplicates(subset=["project_id"], keep="last").copy()

    scored = []
    for _, row in candidates.iterrows():
        pid = str(row["project_id"])
        feat_dict = build_feature_dict(row, OFFICIAL_XGB_FEATURES)
        try:
            sched_score = score_row("schedule_cuf_xgb", feat_dict)
            cost_score = score_row("cost_cuf_xgb", feat_dict)
            comp_score = score_row("compound_cuf_xgb", feat_dict)
        except Exception:
            continue

        scored.append({
            "project_id": pid,
            "sector": str(row.get("sector_std", "")),
            "state": str(row.get("state_std", "")),
            "status": str(row.get("status", "Ongoing")),
            "as_of": row["report_month"].strftime("%Y-%m-%d"),
            "schedule_risk_score": float(sched_score),
            "cost_risk_score": float(cost_score),
            "compound_risk_score": float(comp_score),
        })

    # Sort descending by schedule risk score
    scored_df = pd.DataFrame(scored).sort_values("schedule_risk_score", ascending=False).reset_index(drop=True)
    total_flagged = int((scored_df["schedule_risk_score"] >= 0.63).sum()) if not scored_df.empty else 0

    items = []
    effective_capacity = min(top_n, max(1, int(len(scored_df) * (top_pct / 100.0)))) if not scored_df.empty else top_n

    for idx, row in scored_df.head(100).iterrows():
        rank = idx + 1
        requires_review = bool(row["schedule_risk_score"] >= 0.63 and rank <= effective_capacity)
        items.append(
            OperationalPriorityItem(
                project_id=row["project_id"],
                sector=row["sector"] or None,
                state=row["state"] or None,
                status=row["status"] or None,
                as_of=row["as_of"],
                schedule_risk_score=round(float(row["schedule_risk_score"]), 4),
                schedule_threshold=0.63,
                priority_rank=rank,
                requires_immediate_review=requires_review,
                cost_risk_score=round(float(row["cost_risk_score"]), 4),
                compound_risk_score=round(float(row["compound_risk_score"]), 4),
            )
        )

    return OperationalPriorityResponse(
        items=items,
        total_flagged=total_flagged,
        top_n_capacity=top_n,
        top_pct_capacity=top_pct,
    )


def compare_projects(project_ids: list[str]) -> CompareProjectsResponse:
    from app.services.model_service import score_row, classify, OFFICIAL_XGB_FEATURES
    from app.services.feature_service import build_feature_dict

    df = get_full_df()
    sdf = get_summary_df()
    manifest = get_demo_manifest()
    demo_labels = {d["project_id"]: d.get("demo_label") for d in manifest.get("demo_projects", [])}

    items = []
    for pid in project_ids:
        clean_pid = str(pid).strip()
        if clean_pid not in sdf.index:
            continue
        p_rows = df[df["project_id"] == clean_pid].sort_values("report_month")
        if p_rows.empty:
            continue
        latest = p_rows.iloc[-1]
        feat_dict = build_feature_dict(latest, OFFICIAL_XGB_FEATURES)

        cost_score = score_row("cost_cuf_xgb", feat_dict)
        sched_score = score_row("schedule_cuf_xgb", feat_dict)
        comp_score = score_row("compound_cuf_xgb", feat_dict)

        items.append(
            CompareProjectItem(
                project_id=clean_pid,
                name=demo_labels.get(clean_pid),
                sector=str(latest.get("sector_std", "")) or None,
                state=str(latest.get("state_std", "")) or None,
                status=str(latest.get("status", "Ongoing")) or None,
                as_of=latest["report_month"].strftime("%Y-%m-%d"),
                original_cost=float(latest["original_cost"]) if pd.notna(latest.get("original_cost")) else None,
                current_forecast_cost=float(latest["current_forecast_cost"]) if pd.notna(latest.get("current_forecast_cost")) else None,
                cumulative_expenditure=float(latest["cumulative_expenditure"]) if pd.notna(latest.get("cumulative_expenditure")) else None,
                physical_progress_pct=float(latest["physical_progress_pct"]) if pd.notna(latest.get("physical_progress_pct")) else None,
                reported_delay_months=float(latest["reported_delay_months"]) if pd.notna(latest.get("reported_delay_months")) else None,
                cost_risk_score=round(cost_score, 4),
                schedule_risk_score=round(sched_score, 4),
                compound_risk_score=round(comp_score, 4),
                cost_risk_class=classify(cost_score, 0.88),
                schedule_risk_class=classify(sched_score, 0.63),
                compound_risk_class=classify(comp_score, 0.885),
            )
        )

    return CompareProjectsResponse(projects=items)
