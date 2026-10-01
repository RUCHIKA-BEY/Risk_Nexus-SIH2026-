"""Domain knowledge base for Risk Nexus explanations.

Every term the dashboard shows (model features, scores, SHAP, FCM, metrics)
is defined here in project-monitoring language. The AI explainer is grounded
on these entries so it explains what a term *means in this system*, not a
generic textbook definition. The same entries power the (i) tooltips in the UI
and the rule-based explanation used when no LLM key is configured.

Fields per entry:
    label        display name
    category     feature | target | score | explainability | scenario | metric | data | workflow
    unit         unit of the value, if any
    definition   what exactly it is and how it is derived in this dataset
    how_to_read  what high / low / positive / negative values mean
    why_it_matters  why it is linked to cost or schedule risk
    verify       what a monitoring officer should check on the ground
    fmt          how to format a value: crore | ratio | pct | months | count | flag | text | score

Target entries (cost_event, schedule_event, compound_event, outcome_window) state
only facts verified against enhanced_phase6_corrected.csv: base rates, OCMS-only
labels, complete six-month windows, and compound = cost AND schedule. When the
exact labelling rule is confirmed from the data-preparation pipeline, append it
to the cost_event / schedule_event definitions as a sentence starting
"Specifically, ...".
"""
from __future__ import annotations

from typing import Any

GLOSSARY: dict[str, dict[str, Any]] = {
    # ── Model input features (COMMON set, used by all three official models) ──
    "original_cost": {
        "label": "Original approved cost", "category": "feature", "unit": "Rs crore", "fmt": "crore",
        "definition": "The project cost sanctioned at the first approval, before any revised cost estimate. It is the baseline every overrun is measured against.",
        "how_to_read": "Larger projects have more components, contracts and interfaces. On its own it is not a warning sign; it sets the scale for the other ratios.",
        "why_it_matters": "The model uses size as context: the same expenditure pattern means different things for a Rs 50 crore road and a Rs 5,000 crore refinery.",
        "verify": "Confirm the sanctioned cost and sanction date against the approval order.",
    },
    "planned_duration_months": {
        "label": "Planned duration", "category": "feature", "unit": "months", "fmt": "months",
        "definition": "Months between the project start and the originally planned commissioning date.",
        "how_to_read": "Long planned durations expose a project to more price escalation, land and clearance issues. A missing value means the original schedule was not reported.",
        "why_it_matters": "Duration interacts with elapsed time: a project far into a short schedule is under more pressure than one early in a long schedule.",
        "verify": "Check the original DPR schedule and whether the planned commissioning date was ever recorded.",
    },
    "cumulative_expenditure": {
        "label": "Cumulative expenditure to date", "category": "feature", "unit": "Rs crore", "fmt": "crore",
        "definition": "Total money spent on the project from start up to the reporting month, as reported by the implementing agency.",
        "how_to_read": "Read it together with the original cost and physical progress. Spending far ahead of progress is the classic early overrun signal.",
        "why_it_matters": "Money already committed cannot be recovered; high spend with incomplete work usually means the remaining work needs more money than the approved balance.",
        "verify": "Reconcile with the agency's financial progress report and check for advances or mobilisation payments that inflate spend.",
    },
    "cumulative_to_original_ratio": {
        "label": "Expenditure as a share of original cost", "category": "feature", "unit": "x original cost", "fmt": "ratio",
        "definition": "Cumulative expenditure divided by the original approved cost. 1.0 means the project has spent exactly its original budget; 2.0 means it has spent twice the original budget.",
        "how_to_read": "Below 1.0 is normal for an ongoing project. Above 1.0 means the original budget is already exhausted and the project is running on revised estimates. Values far above 1.0 point to a large, already realised overrun.",
        "why_it_matters": "It is the single most direct measure of cost stress, and it is usually the strongest cost-risk driver in the model.",
        "verify": "Check whether a Revised Cost Estimate (RCE) was approved, and whether the excess spend is scope change, price escalation or poor cost control.",
    },
    "months_from_original_commissioning": {
        "label": "Months past (+) or before (-) original commissioning date", "category": "feature", "unit": "months", "fmt": "months",
        "definition": "Reporting month minus the originally planned commissioning date. Positive values mean the project is already past its original completion date.",
        "how_to_read": "Negative: still within the original schedule. Zero to +6: at the deadline. Large positive values: the project is already late against its first schedule.",
        "why_it_matters": "Projects past their original date tend to accumulate further delays and cost escalation, so this is usually a strong schedule-risk driver.",
        "verify": "Compare the original and current anticipated completion dates and the reasons recorded for each extension.",
    },
    "exp_change_1m": {
        "label": "Expenditure change, last 1 month", "category": "feature", "unit": "Rs crore", "fmt": "crore",
        "definition": "Increase in cumulative expenditure compared with the previous reporting month.",
        "how_to_read": "Near zero means little money moved this month (possible slowdown or reporting gap). A sudden jump may be a bill clearance or advance.",
        "why_it_matters": "Stalled spending often precedes schedule slippage; erratic spikes can signal catch-up billing.",
        "verify": "Check whether work actually stopped, or whether the agency simply did not update the figure.",
    },
    "exp_change_3m": {
        "label": "Expenditure change, last 3 months", "category": "feature", "unit": "Rs crore", "fmt": "crore",
        "definition": "Increase in cumulative expenditure over the last three reporting months.",
        "how_to_read": "Smooths out one-off monthly spikes. Low values over three months suggest a genuine slowdown in execution.",
        "why_it_matters": "Sustained low spending on an incomplete project is a leading indicator of delay.",
        "verify": "Look for contract disputes, fund release delays or site stoppages in the last quarter.",
    },
    "exp_slope_3m": {
        "label": "Expenditure trend (3-month slope)", "category": "feature", "unit": "Rs crore per month", "fmt": "crore",
        "definition": "Average monthly rate of change of cumulative expenditure over the last three months, fitted as a straight-line trend.",
        "how_to_read": "Positive and steady: normal execution. Flattening towards zero: execution is slowing down.",
        "why_it_matters": "Captures momentum, which the model uses to judge whether the project is accelerating or stalling.",
        "verify": "Compare with the planned cash-flow curve (S-curve) for the project.",
    },
    "n_cost_revisions_to_date": {
        "label": "Number of cost revisions to date", "category": "feature", "unit": "count", "fmt": "count",
        "definition": "How many times the project's approved or anticipated cost has been revised upward since sanction, up to the reporting month.",
        "how_to_read": "0 means the project is still on its original cost. Each additional revision means the budget has already been reopened.",
        "why_it_matters": "A project that has been revised once is much more likely to be revised again; revisions are a leading indicator of further overrun.",
        "verify": "Read the justification for each revision (scope change, land cost, price escalation, design change).",
    },
    "n_schedule_revisions_to_date": {
        "label": "Number of schedule revisions to date", "category": "feature", "unit": "count", "fmt": "count",
        "definition": "How many times the anticipated completion date has been pushed back since sanction, up to the reporting month.",
        "how_to_read": "0 means the original completion date still stands. Repeated revisions show persistent schedule instability.",
        "why_it_matters": "Repeated extensions indicate unresolved bottlenecks (land, clearances, contractor capacity) that tend to cause further delay.",
        "verify": "List the extension reasons and whether each bottleneck has actually been cleared.",
    },
    "sector_std": {
        "label": "Sector", "category": "feature", "unit": "", "fmt": "text",
        "definition": "The infrastructure sector of the project (for example Railways, Road Transport and Highways, Power, Petroleum), standardised across OCMS and PAIMANA.",
        "how_to_read": "Sectors differ in typical overrun behaviour because of land acquisition, technology and contracting practices.",
        "why_it_matters": "The model learns sector-level base tendencies, so the same numbers can carry different risk in different sectors.",
        "verify": "Compare against sector norms and recent sector-wide issues (for example commodity price rises).",
    },
    "expenditure_available": {
        "label": "Expenditure reported this month", "category": "data", "unit": "yes/no", "fmt": "flag",
        "definition": "Whether the agency reported an expenditure figure for this month (1) or left it blank (0).",
        "how_to_read": "0 means the spend figures were filled in by the model from typical values, so spend-based conclusions are weaker.",
        "why_it_matters": "Missing reporting is itself informative: projects with poor reporting discipline are often the ones in difficulty.",
        "verify": "Ask the agency for the missing financial progress report.",
    },
    "planned_completion_available": {
        "label": "Planned completion date available", "category": "data", "unit": "yes/no", "fmt": "flag",
        "definition": "Whether an original planned commissioning date exists in the record (1) or not (0).",
        "how_to_read": "0 means schedule measures such as months past commissioning could not be computed and were imputed.",
        "why_it_matters": "Without a baseline date, schedule risk is harder to judge, and the model treats the gap itself as a signal.",
        "verify": "Obtain the original sanctioned completion date.",
    },
    "sector_available": {
        "label": "Sector recorded", "category": "data", "unit": "yes/no", "fmt": "flag",
        "definition": "Whether the project's sector is recorded (1) or missing (0).",
        "how_to_read": "0 means sector-specific patterns could not be applied.",
        "why_it_matters": "About a quarter of records have no sector, so the model has learned to treat this as a separate case.",
        "verify": "Map the project to its ministry and sector.",
    },
    # ── Additional project context (shown, not used by the official models) ──
    "physical_progress_pct": {
        "label": "Physical progress", "category": "context", "unit": "%", "fmt": "pct",
        "definition": "Share of the physical work completed, as reported by the agency (0 to 100 percent).",
        "how_to_read": "Compare with the expenditure ratio: spend well ahead of physical progress is a cost warning; very high progress with high spend often means the overrun has already happened.",
        "why_it_matters": "It is the physical counterpart to financial progress and feeds the FCM physical progress gap. The official XGBoost models do not use it directly.",
        "verify": "Cross-check with site inspection or third-party quality monitoring reports.",
    },
    "current_forecast_cost": {
        "label": "Current forecast cost", "category": "context", "unit": "Rs crore", "fmt": "crore",
        "definition": "The latest anticipated total cost of the project reported by the agency.",
        "how_to_read": "Above the original cost means the agency itself expects an overrun.",
        "why_it_matters": "Used by the FCM forecast cost pressure and the LR benchmark; not by the official XGBoost models.",
        "verify": "Check whether the forecast has a formal approval or is only an agency estimate.",
    },
    "forecast_to_original_ratio": {
        "label": "Forecast cost / original cost", "category": "context", "unit": "x original cost", "fmt": "ratio",
        "definition": "Current forecast cost divided by the original approved cost.",
        "how_to_read": "1.0 means no expected overrun; 1.5 means a 50 percent expected overrun.",
        "why_it_matters": "Feeds the FCM forecast cost pressure concept.",
        "verify": "Compare with the latest RCE status.",
    },
    "reported_delay_months": {
        "label": "Reported delay", "category": "context", "unit": "months", "fmt": "months",
        "definition": "Delay against the original schedule, as reported by the agency for this month.",
        "how_to_read": "0 means on schedule by the agency's own account. Missing means the agency did not report it.",
        "why_it_matters": "Feeds the FCM reported delay pressure; not used by the official XGBoost models.",
        "verify": "Compare with the months past original commissioning computed from dates.",
    },
    # ── Targets ──
    "cost_event": {
        "label": "Cost risk (6-month cost event)", "category": "target", "unit": "", "fmt": "text",
        "definition": "The outcome the cost model was trained to predict: whether the dataset records a new cost-overrun "
                      "event for the project in the six months after the assessment month (1 = yes, 0 = no). Outcomes "
                      "exist only for OCMS records from 2023 to 2025 that have a complete six-month follow-up window. "
                      "Across those project-months a cost event occurs in about 1.9% of cases.",
        "how_to_read": "The cost score estimates the chance of this event. Because the event is rare (about 1.9%), a score "
                       "of 25 to 40 points is already many times the typical project's chance.",
        "why_it_matters": "An early cost flag gives time to scrutinise an upcoming Revised Cost Estimate, re-phase funds "
                          "or tighten contract management before the overrun is formalised.",
        "verify": "Watch for an RCE proposal, a rise in the forecast cost or a fund re-appropriation in the coming months.",
    },
    "schedule_event": {
        "label": "Schedule risk (6-month schedule event)", "category": "target", "unit": "", "fmt": "text",
        "definition": "The outcome the schedule model was trained to predict: whether the dataset records a new "
                      "schedule-slippage event for the project in the six months after the assessment month (1 = yes, "
                      "0 = no). Outcomes exist only for OCMS records from 2023 to 2025 with a complete six-month "
                      "follow-up window. A schedule event occurs in about 6.9% of those project-months.",
        "how_to_read": "The schedule score estimates the chance of this event. The model is tuned to catch most "
                       "slippages (about 82% in validation), so it flags more projects than the cost model; use the "
                       "priority queue to rank them.",
        "why_it_matters": "An early schedule flag lets the monitoring team chase bottlenecks such as land possession, "
                          "clearances or contractor mobilisation before the next extension request.",
        "verify": "Check pending clearances, land possession and contractor manpower on site.",
    },
    "compound_event": {
        "label": "Compound risk", "category": "target", "unit": "", "fmt": "text",
        "definition": "A cost event and a schedule event both recorded for the project in the same six-month window. "
                      "In the dataset, compound is exactly 'cost event AND schedule event' for every labelled "
                      "project-month. It occurs in about 1.4% of cases.",
        "how_to_read": "The rarest and most serious outcome: the project is expected to become more expensive and slip "
                       "at the same time.",
        "why_it_matters": "Projects with compound risk usually need a structured review rather than routine follow-up.",
        "verify": "Treat as a candidate for the next project review meeting with the implementing agency.",
    },
    "outcome_window": {
        "label": "Six-month outcome window", "category": "target", "unit": "months", "fmt": "text",
        "definition": "Each prediction looks forward six months from the assessment month. A project-month has a known "
                      "outcome only if the project kept reporting for that full window. Rows without a full window "
                      "(including all PAIMANA records from 2025 to 2026) have no outcome label: they can be scored, "
                      "but not checked against what actually happened.",
        "how_to_read": "If 'Reveal Actual Outcome' shows N/A, the project-month had no complete follow-up window, so "
                       "there is nothing to compare the prediction with.",
        "why_it_matters": "Training and validating only on complete windows stops the models from learning that a "
                          "project 'had no problem' simply because its later reports are missing.",
        "verify": "Not applicable.",
    },
    # ── Scores and decisions ──
    "risk_score": {
        "label": "Risk score", "category": "score", "unit": "points out of 100", "fmt": "score",
        "definition": "The model's estimated chance that the event happens within six months, shown in points (36 points = 0.36). It comes from an XGBoost model followed by a calibration step fitted on validation data.",
        "how_to_read": "Compare it with the base rate (how often the event happens across all projects) and with the threshold. A score many times the base rate is a strong signal even if it is below 50.",
        "why_it_matters": "Scores are meant for ranking and alerting: which projects to look at first. They are not a guarantee that the event will or will not happen.",
        "verify": "Use the score to prioritise; confirm with project documents before any decision.",
    },
    "threshold": {
        "label": "Alert threshold", "category": "score", "unit": "points", "fmt": "score",
        "definition": "The score at or above which a project is flagged HIGH. Thresholds are fixed in the model registry: 25 points for cost, 20 for schedule, 20 for compound. They were chosen on validation data to give the best balance of precision and recall (maximum F1).",
        "how_to_read": "HIGH means the score crossed the threshold. The distance above the threshold shows how clearly it crossed.",
        "why_it_matters": "Thresholds are deliberately low because overruns are rare; a monitoring agency would rather review some extra projects than miss real ones.",
        "verify": "Not applicable; thresholds are a model setting, never adjusted in the frontend.",
    },
    "base_rate": {
        "label": "Base rate", "category": "metric", "unit": "%", "fmt": "pct",
        "definition": "How often the event actually happens across all eligible project-months in the dataset. It is the 'typical project' chance before looking at any project details.",
        "how_to_read": "If the base rate is 2 percent and a project scores 36 points, the model sees it as roughly 18 times more likely than a typical project.",
        "why_it_matters": "It turns a score into an intuitive comparison.",
        "verify": "Not applicable.",
    },
    "precision": {
        "label": "Precision at threshold", "category": "metric", "unit": "%", "fmt": "pct",
        "definition": "Of all project-months the model flagged HIGH during validation, the share where the event really happened.",
        "how_to_read": "Precision of 40 percent means about 4 in 10 flagged projects went on to have the event; the rest were false alarms.",
        "why_it_matters": "Tells an officer how much follow-up effort each alert is likely to be worth.",
        "verify": "Not applicable.",
    },
    "recall": {
        "label": "Recall at threshold", "category": "metric", "unit": "%", "fmt": "pct",
        "definition": "Of all project-months where the event really happened during validation, the share the model had flagged HIGH in advance.",
        "how_to_read": "Recall of 74 percent means the model caught about three quarters of real events ahead of time.",
        "why_it_matters": "High recall is what makes an early-warning system useful: few problems slip through unflagged.",
        "verify": "Not applicable.",
    },
    "roc_auc": {
        "label": "ROC-AUC", "category": "metric", "unit": "0 to 1", "fmt": "text",
        "definition": "The probability that the model ranks a randomly chosen project that had the event above a randomly chosen project that did not.",
        "how_to_read": "0.5 is random ranking, 1.0 is perfect. 0.96 means the model ranks correctly 96 times out of 100.",
        "why_it_matters": "Measures how good the model is at ordering projects by risk, which is how the priority queue uses it.",
        "verify": "Not applicable.",
    },
    # ── Explainability ──
    "shap_value": {
        "label": "SHAP contribution", "category": "explainability", "unit": "log-odds", "fmt": "text",
        "definition": "How much one input pushed this project's score up or down compared with an average project, computed exactly from the trained XGBoost trees (TreeSHAP). Contributions of all inputs add up to the difference between this project's raw score and the average.",
        "how_to_read": "Positive (red) raises risk, negative (green) lowers it. Bigger magnitude means bigger influence. Values are on the model's internal log-odds scale, so they are not points of probability.",
        "why_it_matters": "Shows which facts about the project drove the alert, so the review can start with the right documents.",
        "verify": "SHAP shows what the model associated with risk, not proof of cause. Check the underlying fact on the ground.",
    },
    "top_drivers": {
        "label": "Top drivers", "category": "explainability", "unit": "", "fmt": "text",
        "definition": "The inputs with the largest SHAP contributions for this project and month, split into those raising and those lowering risk.",
        "how_to_read": "Start with the first red driver; it is the fact that most separates this project from a typical one.",
        "why_it_matters": "Turns a single score into a short list of reasons an officer can act on.",
        "verify": "Take each driver to the relevant document (financial report, revision orders, schedule).",
    },
    # ── Scenario layer ──
    "fcm": {
        "label": "Fuzzy cognitive map (what-if)", "category": "scenario", "unit": "0 to 1", "fmt": "text",
        "definition": "A network of nine project-pressure concepts connected by sixteen weighted links set by domain experts. Six input pressures are computed from the project's record; the network then propagates them to schedule pressure, cost pressure and intervention priority.",
        "how_to_read": "States run from 0 (no pressure) to 1 (maximum pressure). Above 0.5 counts as activated. Moving a slider shows how a change in one pressure spreads through the others.",
        "why_it_matters": "Lets an officer test an intervention (for example closing the progress gap) before acting. It never changes the official ML scores.",
        "verify": "The link weights are an expert draft awaiting domain approval; treat results as reasoning support, not prediction.",
    },
    "physical_progress_gap": {"label": "Physical progress gap", "category": "scenario", "unit": "0 to 1", "fmt": "text",
        "definition": "1 minus physical progress. 0.03 means 97 percent of the work is complete. Set to 0.5 when progress is not reported.",
        "how_to_read": "Higher means more work remains.", "why_it_matters": "Feeds schedule pressure (weight 0.70) and cost pressure (0.50).",
        "verify": "Physical progress report and site inspection."},
    "expenditure_progress_gap": {"label": "Expenditure pressure", "category": "scenario", "unit": "0 to 1", "fmt": "text",
        "definition": "Expenditure as a share of original cost, divided by 3 and capped at 1. A project that has spent 3 times its original cost or more scores 1.0.",
        "how_to_read": "Higher means spending is further beyond the original budget.", "why_it_matters": "The strongest link into cost pressure (weight 0.80).",
        "verify": "Financial progress report and RCE status."},
    "reported_delay_pressure": {"label": "Reported delay pressure", "category": "scenario", "unit": "0 to 1", "fmt": "text",
        "definition": "Reported delay in months divided by 60 and capped at 1. Set to 0 when delay is not reported.",
        "how_to_read": "Higher means a longer reported delay.", "why_it_matters": "Feeds schedule pressure (0.80) and cost pressure (0.50).",
        "verify": "Agency delay statement."},
    "cost_revision_pressure": {"label": "Cost revision pressure", "category": "scenario", "unit": "0 to 1", "fmt": "text",
        "definition": "Number of cost revisions divided by 5 and capped at 1.",
        "how_to_read": "Each revision adds 0.2.", "why_it_matters": "Feeds cost pressure (0.90) and intervention priority (0.60).",
        "verify": "Revision orders."},
    "schedule_revision_pressure": {"label": "Schedule revision pressure", "category": "scenario", "unit": "0 to 1", "fmt": "text",
        "definition": "Number of schedule revisions divided by 5 and capped at 1.",
        "how_to_read": "Each revision adds 0.2.", "why_it_matters": "Feeds schedule pressure (0.90) and intervention priority (0.60).",
        "verify": "Extension orders."},
    "forecast_cost_pressure": {"label": "Forecast cost pressure", "category": "scenario", "unit": "0 to 1", "fmt": "text",
        "definition": "(Forecast cost / original cost - 1) divided by 2 and capped at 1. A forecast at 3 times the original cost or more scores 1.0.",
        "how_to_read": "Higher means a larger expected overrun.", "why_it_matters": "Feeds cost pressure (0.75) and cost revision pressure (0.50).",
        "verify": "Latest forecast cost and its approval status."},
    "schedule_pressure": {"label": "Schedule pressure", "category": "scenario", "unit": "0 to 1", "fmt": "text",
        "definition": "Combined pressure on the timeline after propagating the input pressures through the network.",
        "how_to_read": "Above 0.5 means schedule pressure is activated.", "why_it_matters": "Feeds intervention priority (0.70) and cost pressure (0.40).",
        "verify": "Schedule review."},
    "cost_pressure": {"label": "Cost pressure", "category": "scenario", "unit": "0 to 1", "fmt": "text",
        "definition": "Combined pressure on cost after propagating the input pressures through the network.",
        "how_to_read": "Above 0.5 means cost pressure is activated.", "why_it_matters": "Feeds intervention priority (0.70) and schedule pressure (0.30).",
        "verify": "Cost review."},
    "intervention_priority": {"label": "Intervention priority", "category": "scenario", "unit": "0 to 1", "fmt": "text",
        "definition": "The network's overall need-for-review signal, combining schedule pressure, cost pressure and revision counts.",
        "how_to_read": "Above 0.5 suggests the project warrants active review.", "why_it_matters": "A reasoning aid alongside, not instead of, the official scores.",
        "verify": "Decide whether to schedule a review meeting."},
    # ── Workflow / other terms on screen ──
    "as_of_month": {"label": "Assessment month (as of)", "category": "workflow", "unit": "", "fmt": "text",
        "definition": "The reporting month the assessment is made for. Only data reported in or before this month is used, so a past assessment shows exactly what an officer could have known then.",
        "how_to_read": "Pick the latest month for a current view, or an earlier month to back-test.", "why_it_matters": "Prevents look-ahead bias.", "verify": "Not applicable."},
    "lr_benchmark": {"label": "LR benchmark", "category": "workflow", "unit": "", "fmt": "text",
        "definition": "Scores from logistic regression, a simpler statistical model, shown only for comparison with the official XGBoost models. Never blended into the official result.",
        "how_to_read": "If both models agree, the signal is robust; if they disagree, look at the drivers more closely.", "why_it_matters": "A sanity check on the main model.", "verify": "Not applicable."},
    "actual_outcome": {"label": "Actual outcome", "category": "workflow", "unit": "", "fmt": "text",
        "definition": "For historical test projects, whether the event really happened in the six months after the as-of month. True positive: flagged and happened. False positive: flagged but did not happen. False negative: missed. True negative: not flagged and did not happen.",
        "how_to_read": "Used to demonstrate and audit model reliability.", "why_it_matters": "Builds trust by showing hits and misses.", "verify": "Not applicable."},
    "data_quality_warning": {"label": "Data quality note", "category": "data", "unit": "", "fmt": "text",
        "definition": "A message raised when an input the model needs was missing for this month and was filled with the median value from training data.",
        "how_to_read": "The more notes, the less the score rests on this project's own facts.", "why_it_matters": "An imputed value can itself become a driver, which should be read with caution.",
        "verify": "Obtain the missing figure from the agency."},
    "priority_queue": {"label": "Operational priority queue", "category": "workflow", "unit": "", "fmt": "text",
        "definition": "Projects flagged for schedule risk, ranked by score and cut to the review capacity chosen (top 10, 25, 50 or 100).",
        "how_to_read": "Start at the top; urgency labels reflect score rank.", "why_it_matters": "The schedule model flags about a third of project-months, so ranking is needed to make alerts actionable.", "verify": "Not applicable."},
}

# App-level knowledge for the REX assistant (what each page does).
APP_PAGES: dict[str, str] = {
    "Dashboard": "Portfolio KPIs (projects monitored, total cost, schedule-risk flags, active priority reviews) and the monitored projects table with drill-down.",
    "Public Dashboard": "Citizen-facing view: sanctioned cost vs expenditure by sector, physical progress bands, interactive India map of project concentration by state.",
    "All Projects": "Searchable register of all projects with sector and status filters and an Assess Risk action.",
    "Risk Assessment": "Pick an as-of month and run the three official models; see risk cards, data quality notes, top SHAP drivers, AI explanation, actual outcome, LR benchmark and the FCM what-if panel.",
    "Risk Trajectory": "Month-by-month cost, schedule and compound scores for one project, each using only data available that month.",
    "Comparison": "Up to three projects side by side on cost, spend, progress, delay and risk scores.",
    "Map View": "State-wise project counts, sanctioned cost and flagged projects, with CSV/Excel export.",
    "Analytics": "Sector cost overview, risk distribution and the monthly expenditure trend across the portfolio.",
    "AI Insights": "Demonstration projects (true/false positives and negatives) and the model routing guarantees.",
    "Risk Alerts": "Feed of projects that crossed the schedule-risk threshold.",
    "Actions": "Operational priority queue ranked by schedule risk and cut to review capacity.",
    "Reports": "Audit report of the three official scores for selected projects.",
    "Settings": "Backend health, registry version and which models are active.",
}


def term(key: str) -> dict[str, Any] | None:
    entry = GLOSSARY.get(key)
    return {"key": key, **entry} if entry else None


def glossary_list() -> list[dict[str, Any]]:
    return [{"key": k, **v} for k, v in GLOSSARY.items()]


def glossary_text(keys: list[str] | None = None) -> str:
    """Compact plain-text rendering used inside LLM prompts."""
    items = GLOSSARY.items() if keys is None else ((k, GLOSSARY[k]) for k in keys if k in GLOSSARY)
    lines = []
    for k, v in items:
        lines.append(
            f"- {k} ({v['label']}, unit: {v.get('unit') or '-'}): {v['definition']} "
            f"How to read: {v['how_to_read']} Why it matters: {v['why_it_matters']} Verify: {v['verify']}"
        )
    return "\n".join(lines)
