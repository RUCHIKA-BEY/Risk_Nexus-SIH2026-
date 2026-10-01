"""Deep AI explanation and REX assistant.

Two modes, same output shape:
* "gemini"     - Gemini writes the explanation, grounded on ai_context + glossary.
* "rule_based" - a deterministic explainer that uses the same context, so the
                 panel is still specific and useful when no API key is set.

The legacy /ai/explain endpoint (gemini_service.py) is left untouched.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from app.config import GEMINI_API_KEY
from app.explainability.glossary import APP_PAGES, GLOSSARY, glossary_text
from app.services.ai_context import build_context, jsonable

logger = logging.getLogger(__name__)

AI_MODEL = (os.getenv("GEMINI_EXPLAINER_MODEL") or "gemini-flash-latest").strip()
AI_TIMEOUT = float(os.getenv("AI_TIMEOUT_SECONDS") or 45)

TARGET_LABEL = {"cost": "cost overrun", "schedule": "schedule slippage", "compound": "cost overrun and schedule slippage together"}
DISCLAIMER = (
    "AI-assisted explanation grounded on the official model outputs. Risk scores support prioritisation and are not "
    "guarantees. SHAP shows what the model associated with risk, not proven causes. FCM results are draft scenario "
    "reasoning, not predictions."
)


# ── Response schemas ───────────────────────────────────────────────────────────

class TargetExplanation(BaseModel):
    target: Literal["cost", "schedule", "compound"]
    label: str
    risk_level: str
    score_points: float
    threshold_points: float
    meaning: str = Field(description="What this score means in plain terms, using base rate, threshold, precision and recall.")
    reasons: list[str] = Field(description="The 2-3 facts about this project that most drove this score.")


class DriverExplanation(BaseModel):
    feature: str
    label: str
    targets: list[str]
    effect: str
    this_project: str = Field(description="This project's value with units.")
    typical_peer: str = Field(description="How it compares with similar projects.")
    what_it_means: str = Field(description="Exact meaning of this term in this system.")
    why_it_affects_risk: str = Field(description="Why this value moves the risk for THIS project.")
    what_to_verify: str = Field(description="Concrete check for the monitoring officer.")


class ActionItem(BaseModel):
    action: str
    reason: str
    priority: Literal["immediate", "next review", "monitor"]


class GlossaryItem(BaseModel):
    term: str
    meaning: str


class ExplanationBody(BaseModel):
    headline: str
    overview: str
    targets: list[TargetExplanation]
    drivers: list[DriverExplanation]
    scenario: str
    trend: str
    data_gaps: list[str]
    actions: list[ActionItem]
    reliability: str
    glossary: list[GlossaryItem]
    follow_up_questions: list[str]


class DeepExplanationRequest(BaseModel):
    project_id: str
    as_of: Optional[str] = None
    fcm_overrides: Optional[dict[str, float]] = None


class DeepExplanationResponse(ExplanationBody):
    project_id: str
    as_of: str
    data_row_month: str
    source: Literal["gemini", "rule_based"]
    model: Optional[str] = None
    disclaimer: str = DISCLAIMER


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    project_id: Optional[str] = None
    as_of: Optional[str] = None
    page: Optional[str] = None
    history: list[ChatTurn] = Field(default_factory=list, max_length=12)


class AskResponse(BaseModel):
    answer: str
    terms: list[GlossaryItem] = Field(default_factory=list)
    source: Literal["gemini", "rule_based"]
    model: Optional[str] = None


# ── Prompts ────────────────────────────────────────────────────────────────────

EXPLAIN_SYSTEM = """You are the explanation engine of Risk Nexus, an infrastructure project risk monitoring platform
for India's central-sector projects (MoSPI OCMS / PAIMANA data). Your reader is a project monitoring officer or an
industry expert. They want to understand exactly what each number and term means for THIS project, not generic text.

Grounding rules (strict):
1. Use only facts in CONTEXT. Never invent values, events, dates, causes or documents.
2. Copy numbers exactly as given (points, crore, ratios, percentiles). Scores are in points out of 100.
3. Explain every technical term using its GLOSSARY meaning, applied to this project's actual value.
   Bad: "Cumulative ratio is an important factor." Good: "The project has spent Rs 2,510.86 crore against an
   original cost of Rs 372.14 crore, i.e. 6.75x the original budget; the median Railways project is at 0.69x."
4. Compare with the peer group when a peer entry exists, and with the base rate when explaining a score.
5. SHAP shows association, not cause. Say "the model associates..." not "this causes...".
6. FCM is an expert-draft scenario tool; never present it as a prediction.
7. If an input was not reported, say so and say that the model used a typical (median) value instead.
8. Do not state the exact rule used to label cost or schedule events; describe them as the dataset's 6-month
   cost / schedule event.
9. Every sentence must carry a specific fact from CONTEXT. No filler, no marketing language.

Content requirements:
- headline: one sentence verdict naming how many of the three risks are HIGH and the single biggest reason.
- overview: 3-5 sentences telling the project's story from the facts (size, spend vs budget, progress, revisions,
  schedule baseline) and what the scores mean together.
- targets: one entry per target (cost, schedule, compound). meaning must use score, threshold, base rate
  (times base rate), and validation precision and recall in plain words.
- drivers: the 5-7 most important distinct drivers across all targets (largest absolute SHAP), each with all fields.
- scenario: what the FCM baseline shows (activated pressures, strongest pathway); if fcm_scenario exists, compare it.
- trend: how the scores moved over the months in CONTEXT.trend.
- data_gaps: each missing input and how it weakens the assessment.
- actions: 3-6 concrete checks tied to the drivers, with priority.
- reliability: how far to trust this assessment (validation metrics, imputed inputs).
- glossary: 5-8 terms used above with one-line meanings specific to this system.
- follow_up_questions: 3 questions the officer could ask next.
Write in clear, plain English."""

ASK_SYSTEM = """You are REX, the assistant inside the Risk Nexus infrastructure risk monitoring platform.
Answer questions about the platform, its terms, and (when PROJECT CONTEXT is given) the specific project.
Rules: use the GLOSSARY meanings; tie explanations to the project's actual numbers when available; never invent
values; SHAP is association not cause; FCM is a draft scenario tool; risk scores are for prioritisation, not
guarantees. If the answer is not in the provided material, say what is missing. Be precise and teach the user:
define the term, show how it applies here, and say what it implies for monitoring. Keep answers under 250 words
unless asked for more. Use short paragraphs or bullet points; plain text only (no tables)."""


# ── Gemini client ──────────────────────────────────────────────────────────────

async def _gemini(system: str, prompt: str, schema: Any | None) -> str:
    from google import genai  # google-genai SDK
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)
    cfg: dict[str, Any] = {"system_instruction": system, "temperature": 0.2,
                           "automatic_function_calling": types.AutomaticFunctionCallingConfig(disable=True)}
    if schema is not None:
        cfg["response_mime_type"] = "application/json"
        cfg["response_schema"] = schema
    resp = await asyncio.wait_for(
        client.aio.models.generate_content(model=AI_MODEL, contents=prompt,
                                           config=types.GenerateContentConfig(**cfg)),
        timeout=AI_TIMEOUT,
    )
    return (resp.text or "").strip()


# ── Rule-based explainer (no key needed) ───────────────────────────────────────

def _g(key: str, field: str, default: str = "") -> str:
    return GLOSSARY.get(key, {}).get(field, default)


def _peer_sentence(peer: Optional[dict[str, Any]]) -> str:
    if not peer:
        return "No peer comparison available."
    return (f"Median of {peer['peer_count']} {peer['peer_group']}: {peer['peer_median_display']}. "
            f"This project is at the {peer['percentile']:.0f}th percentile, {peer['position']}.")


def _fact(ctx: dict[str, Any], key: str) -> dict[str, Any]:
    return next((f for f in ctx["facts"] if f["key"] == key), {"display": "not reported", "value": None, "missing": True})


def rule_based(ctx: dict[str, Any]) -> ExplanationBody:
    p, preds, drivers = ctx["project"], ctx["predictions"], ctx["drivers"]
    sector = (p.get("sector") or "unclassified").title()
    highs = [t for t in ("cost", "schedule", "compound") if preds[t]["risk_level"] == "HIGH"]

    # merge drivers across targets
    merged: dict[str, dict[str, Any]] = {}
    for t in ("cost", "schedule", "compound"):
        for d in drivers[t][:4]:
            m = merged.setdefault(d["feature"], {**d, "targets": [], "max_abs": 0.0, "effects": set()})
            m["targets"].append(t)
            m["effects"].add(d["effect"])
            m["max_abs"] = max(m["max_abs"], abs(d["shap"]))
    top = sorted(merged.values(), key=lambda d: -d["max_abs"])[:6]
    lead = top[0] if top else None

    ratio, spend, cost0 = _fact(ctx, "cumulative_to_original_ratio"), _fact(ctx, "cumulative_expenditure"), _fact(ctx, "original_cost")
    prog, fc = _fact(ctx, "physical_progress_pct"), _fact(ctx, "current_forecast_cost")
    crev, srev = _fact(ctx, "n_cost_revisions_to_date"), _fact(ctx, "n_schedule_revisions_to_date")
    mpast = _fact(ctx, "months_from_original_commissioning")

    headline = (f"{len(highs)} of 3 risks are HIGH for {sector} project {p['project_id']} as of {p['data_row_month']}"
                + (f"; the strongest reason is {lead['label'].lower()} ({lead['value_display'].split(' (')[0]})." if lead else "."))

    ov = [f"This {sector} project was sanctioned at {cost0['display']} and has spent {spend['display']} so far"
          + (f", which is {ratio['display']}." if not ratio["missing"] else ".")]
    if ratio.get("peer"):
        ov.append(f"For comparison, the median across {ratio['peer']['peer_group']} is {ratio['peer']['peer_median_display']}.")
    if not prog["missing"]:
        ov.append(f"Reported physical progress is {prog['display']}"
                  + (f" and the agency's current forecast cost is {fc['display']}." if not fc["missing"] else "."))
    def _times(f: dict[str, Any]) -> str:
        return "an unknown number of times" if f["missing"] else ("once" if f["display"] == "1" else f"{f['display']} times")
    ov.append(f"The cost has been revised {_times(crev)} and the schedule {_times(srev)}"
              + ("; the original commissioning date is not recorded, so schedule timing had to be estimated." if mpast["missing"]
                 else f"; the project is {mpast['display']} relative to its original commissioning date."))
    joined = (", ".join(highs[:-1]) + " and " + highs[-1]) if len(highs) > 1 else (highs[0] if highs else "no")
    ov.append(f"Together the models flag {joined} risk for the next six months.")

    targets = []
    for t in ("cost", "schedule", "compound"):
        pr = preds[t]
        v = pr["validation"]
        meaning = (f"A score of {pr['score_points']} points means the model estimates roughly a {pr['score_points']:.0f}% chance of "
                   f"{TARGET_LABEL[t]} being recorded in the next {pr['horizon_months']} months.")
        if pr.get("base_rate_pct"):
            meaning += (f" Across all projects this happens in only {pr['base_rate_pct']}% of cases, so this project is about "
                        f"{pr['times_base_rate']} times the typical rate.")
        meaning += (f" It is {abs(pr['points_above_threshold'])} points {'above' if pr['points_above_threshold'] >= 0 else 'below'} "
                    f"the alert threshold of {pr['threshold_points']}.")
        if v.get("precision_pct") is not None:
            meaning += (f" In validation, about {v['precision_pct']:.0f}% of projects flagged at this threshold went on to have the event, "
                        f"and the model caught {v['recall_pct']:.0f}% of all such events in advance.")
        reasons = [f"{d['label']}: {d['value_display']} ({d['effect']}, {d['strength']})" for d in drivers[t] if d["shap"] > 0][:3]
        targets.append(TargetExplanation(target=t, label=_g(f"{t}_event", "label", t), risk_level=pr["risk_level"],
                                         score_points=pr["score_points"], threshold_points=pr["threshold_points"],
                                         meaning=meaning, reasons=reasons or ["No input pushed this score up notably."]))

    dexp = []
    for d in top:
        effect = " / ".join(sorted(d["effects"]))
        why = f"The model {'associates this value with higher' if 'raises risk' in d['effects'] else 'treats this value as lowering'} " \
              f"{' and '.join(d['targets'])} risk ({d['strength']} influence). {_g(d['feature'], 'why_it_matters')}"
        if d["value_missing"]:
            why += " The value was not reported, so the model used the typical (median) value from training; the gap itself carries signal."
        dexp.append(DriverExplanation(
            feature=d["feature"], label=d["label"], targets=d["targets"], effect=effect,
            this_project=d["value_display"], typical_peer=_peer_sentence(d.get("peer")),
            what_it_means=_g(d["feature"], "definition", d["label"]) + " " + _g(d["feature"], "how_to_read"),
            why_it_affects_risk=why, what_to_verify=_g(d["feature"], "verify", "Check the source record."),
        ))

    fb = ctx["fcm_baseline"]
    act = [s["label"].lower() for s in fb["states"].values() if s["activated"] and s["role"] != "input"]
    act_in = [s["label"].lower() for s in fb["states"].values() if s["activated"] and s["role"] == "input"]
    scen = (f"In the draft what-if network, the activated input pressures are {', '.join(act_in) or 'none'}, which push "
            f"{', '.join(act) or 'no downstream pressure'} above the 0.5 activation level.")
    if fb["strongest_pathways"]:
        sp = fb["strongest_pathways"][0]
        scen += f" The strongest pathway is {sp['path'].replace('_', ' ')} (strength {sp['strength']})."
    scen += (f" Cost pressure is {fb['states']['cost_pressure']['state']}, schedule pressure {fb['states']['schedule_pressure']['state']} "
             f"and intervention priority {fb['states']['intervention_priority']['state']} on a 0 to 1 scale.")
    if ctx.get("fcm_scenario"):
        sc = ctx["fcm_scenario"]["states"]
        scen += (f" With your scenario settings, these become {sc['cost_pressure']['state']}, {sc['schedule_pressure']['state']} and "
                 f"{sc['intervention_priority']['state']}.")
    scen += " These are expert-draft weights for reasoning only; they never change the official scores."

    tr = ctx["trend"]
    if len(tr) >= 2:
        parts = []
        for t in ("cost", "schedule", "compound"):
            a, b = tr[0].get(t), tr[-1].get(t)
            if a is not None and b is not None:
                thr = preds[t]["threshold_points"]
                above = sum(1 for x in tr if x.get(t) is not None and x[t] >= thr)
                parts.append(f"{t} moved from {a} to {b} points ({above} of {len(tr)} months at or above {thr})")
        trend = f"Over {tr[0]['month']} to {tr[-1]['month']}: " + "; ".join(parts) + "."
    else:
        trend = "Only one reporting month is available, so no trend can be shown."

    gaps, seen = [], set()
    for g in ctx["data_gaps"]:
        seen.add(g["field"])
        gaps.append(f"{g['label']}: {g['issue']}")
    for f in ctx["facts"]:
        if f["used_by_official_models"] and f["missing"] and f["key"] not in seen:
            gaps.append(f"{f['label']}: not reported this month; the model used a typical value instead.")

    actions: list[ActionItem] = []
    if "cost" in highs and (ratio.get("value") or 0) > 1:
        actions.append(ActionItem(action="Confirm the Revised Cost Estimate status and what the spend above the original cost was for.",
                                  reason=f"Spend is {ratio['display']}.", priority="immediate"))
    if (crev.get("value") or 0) >= 1:
        actions.append(ActionItem(action="Review the justification for each cost revision and whether another revision is being prepared.",
                                  reason=f"{crev['display']} cost revision(s) to date; revisions tend to repeat.", priority="next review"))
    if "schedule" in highs and mpast["missing"]:
        actions.append(ActionItem(action="Obtain the original sanctioned commissioning date from the agency.",
                                  reason="Without it, schedule risk rests on imputed timing.", priority="immediate"))
    if "compound" in highs:
        actions.append(ActionItem(action="Place the project on the agenda of the next project review meeting.",
                                  reason="Cost and schedule risk are both flagged.", priority="next review"))
    if gaps:
        actions.append(ActionItem(action="Ask the agency to fill the missing fields in the next monthly report.",
                                  reason=f"{len(gaps)} input(s) were missing and imputed.", priority="monitor"))
    for d in top[:2]:
        actions.append(ActionItem(action=_g(d["feature"], "verify", "Check the source record."),
                                  reason=f"Top driver: {d['label']} ({d['value_display']}).", priority="monitor"))

    v = preds["cost"]["validation"]
    reliability = (f"The official models were validated on held-out projects (cost ROC-AUC {v['roc_auc']}, schedule "
                   f"{preds['schedule']['validation']['roc_auc']}, compound {preds['compound']['validation']['roc_auc']}). "
                   f"{len(gaps)} input(s) were imputed for this month, so the result leans partly on typical values. "
                   "Use the scores to prioritise review, then confirm with project documents.")

    used = ["risk_score", "threshold", "base_rate", "precision", "recall", "shap_value"] + [d["feature"] for d in top[:3]] + ["fcm"]
    gloss = [GlossaryItem(term=_g(k, "label", k), meaning=_g(k, "definition")) for k in dict.fromkeys(used) if k in GLOSSARY]

    followups = [
        f"Why does {lead['label'].lower()} matter so much for this project?" if lead else "What drives this score?",
        "What would happen to cost pressure if physical progress improved?",
        "How reliable is a HIGH flag at this threshold?",
    ]
    return ExplanationBody(headline=headline, overview=" ".join(ov), targets=targets, drivers=dexp, scenario=scen,
                           trend=trend, data_gaps=gaps, actions=actions[:6], reliability=reliability,
                           glossary=gloss, follow_up_questions=followups)


# ── Public API ─────────────────────────────────────────────────────────────────

async def deep_explanation(req: DeepExplanationRequest) -> DeepExplanationResponse:
    ctx = jsonable(build_context(req.project_id, req.as_of, req.fcm_overrides))
    meta = {"project_id": req.project_id, "as_of": ctx["project"]["as_of_requested"],
            "data_row_month": ctx["project"]["data_row_month"]}
    if GEMINI_API_KEY:
        try:
            prompt = "CONTEXT (JSON):\n" + json.dumps({k: v for k, v in ctx.items() if k != "glossary"}, ensure_ascii=False) \
                     + "\n\nGLOSSARY:\n" + glossary_text(list(ctx["glossary"].keys()))
            text = await _gemini(EXPLAIN_SYSTEM, prompt, ExplanationBody)
            body = ExplanationBody.model_validate_json(text)
            return DeepExplanationResponse(**body.model_dump(), **meta, source="gemini", model=AI_MODEL)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Gemini deep explanation failed (%s); using rule-based explainer.", str(exc)[:200])
    body = rule_based(ctx)
    return DeepExplanationResponse(**body.model_dump(), **meta, source="rule_based")


def _match_terms(text: str) -> list[str]:
    t = text.lower()
    hits = []
    for k, v in GLOSSARY.items():
        names = {k.replace("_", " "), k, v["label"].lower()}
        if any(n in t for n in names) or any(w in t for w in (v["label"].lower().split(" (")[0],)):
            hits.append(k)
    aliases = {"shap": "shap_value", "threshold": "threshold", "fcm": "fcm", "what-if": "fcm", "precision": "precision",
               "recall": "recall", "auc": "roc_auc", "base rate": "base_rate", "score": "risk_score",
               "compound": "compound_event", "benchmark": "lr_benchmark", "outcome": "actual_outcome",
               "as of": "as_of_month", "queue": "priority_queue", "imput": "data_quality_warning","window": "outcome_window", "eligible": "outcome_window", "n/a": "outcome_window",}
    for a, k in aliases.items():
        if a in t and k not in hits:
            hits.append(k)
    return hits[:6]


async def ask(req: AskRequest) -> AskResponse:
    ctx = None
    if req.project_id:
        try:
            ctx = jsonable(build_context(req.project_id, req.as_of))
        except Exception as exc:  # noqa: BLE001
            logger.info("No project context for REX (%s)", exc)
    terms = _match_terms(req.question)
    term_items = [GlossaryItem(term=_g(k, "label", k), meaning=_g(k, "definition")) for k in terms]

    if GEMINI_API_KEY:
        try:
            parts = ["GLOSSARY:\n" + glossary_text(),
                     "PLATFORM PAGES:\n" + "\n".join(f"- {k}: {v}" for k, v in APP_PAGES.items())]
            if req.page:
                parts.append(f"USER IS ON PAGE: {req.page}")
            if ctx:
                compact = {k: ctx[k] for k in ("project", "facts", "predictions", "drivers", "fcm_baseline", "trend", "data_gaps")}
                parts.append("PROJECT CONTEXT (JSON):\n" + json.dumps(compact, ensure_ascii=False))
            convo = "\n".join(f"{t.role.upper()}: {t.content}" for t in req.history[-8:])
            prompt = "\n\n".join(parts) + (f"\n\nCONVERSATION SO FAR:\n{convo}" if convo else "") + f"\n\nUSER: {req.question}"
            answer = await _gemini(ASK_SYSTEM, prompt, None)
            if answer:
                return AskResponse(answer=answer, terms=term_items, source="gemini", model=AI_MODEL)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Gemini REX failed (%s); using glossary answer.", str(exc)[:200])

    # Rule-based answer: glossary definitions applied to the project where possible.
    lines = []
    for k in terms:
        e = GLOSSARY[k]
        s = f"{e['label']}: {e['definition']} {e['how_to_read']}"
        if ctx:
            f = next((x for x in ctx["facts"] if x["key"] == k), None)
            if f:
                s += f" For project {ctx['project']['project_id']} it is {f['display']}."
                if f.get("peer"):
                    s += " " + _peer_sentence(f["peer"])
        lines.append(s)
    if not lines and ctx:
        body = rule_based(ctx)
        lines = [body.headline, body.overview]
    if not lines:
        lines = ["I can explain any term on the dashboard, for example risk score, threshold, SHAP, FCM, base rate, "
                 "expenditure as a share of original cost, or cost revisions. Ask about one of these, or open a project "
                 "so I can explain its numbers. Free-form answers need the GEMINI_API_KEY to be set on the server."]
    return AskResponse(answer="\n\n".join(lines), terms=term_items, source="rule_based")
