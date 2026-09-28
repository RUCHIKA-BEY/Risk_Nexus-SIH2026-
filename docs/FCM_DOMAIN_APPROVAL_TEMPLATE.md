# FCM domain-approval checklist

The FastAPI FCM engine is deterministic, bounded, damped, convergence-checked,
and kept separate from the official frozen XGBoost predictions. The current
weights and input normalisation rules remain **draft** until this checklist is
completed by an authorised project/domain expert.

## Required approval

For every input concept, record:

| Concept | Exact source column(s) | Formula at month T | Normalisation to [0,1] | Missing-value rule | Approved? |
|---|---|---|---|---|---|
| physical_progress_gap |  |  |  |  |  |
| expenditure_progress_gap |  |  |  |  |  |
| reported_delay_pressure |  |  |  |  |  |
| cost_revision_pressure |  |  |  |  |  |
| schedule_revision_pressure |  |  |  |  |  |
| forecast_cost_pressure |  |  |  |  |  |

For every directed edge, approve its sign and weight in `[-1, +1]` and provide
a short evidence/basis statement. Also confirm which inputs a dashboard user is
allowed to change in a scenario.

## Validation before enabling operational use

- Confirm all formulas use information available at or before reporting month T.
- Run convergence checks for baseline and extreme-input scenarios.
- Run one-at-a-time and global sensitivity checks on all approved weights.
- Review output direction with domain experts using representative projects.
- Record approver name/role, approval date, configuration version, and checksum.
- Keep the FCM labelled as scenario analysis; never call its outputs predictions,
  probabilities, or causal effects.

Approver: ____________________  Role: ____________________

Approval date: ______________  Configuration version: ______________
