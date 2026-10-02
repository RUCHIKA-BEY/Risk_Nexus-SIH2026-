/**
 * FCM Constants — metadata, categories, presets, and authentic graph edges.
 *
 * All edges and weights are sourced verbatim from:
 *   backend/app/fcm/fcm_weights.json
 *
 * Presets are frontend-only input configurations. They override slider values
 * but use the existing FCM simulation engine without modification.
 */

// ── Node Metadata ───────────────────────────────────────────────────────────────

export const FCM_NODES = {
  // Input nodes (exogenous — clamped during propagation)
  physical_progress_gap: {
    key: 'physical_progress_gap',
    label: 'Physical Progress Gap',
    shortLabel: 'Progress Gap',
    role: 'input',
    category: 'physical',
    description: 'Share of physical progress not yet achieved at the reporting month.',
  },
  reported_delay_pressure: {
    key: 'reported_delay_pressure',
    label: 'Delay Pressure',
    shortLabel: 'Delay',
    role: 'input',
    category: 'schedule',
    description: 'Normalised source-reported delay (months / 60).',
  },
  schedule_revision_pressure: {
    key: 'schedule_revision_pressure',
    label: 'Schedule Revision Pressure',
    shortLabel: 'Sched. Revisions',
    role: 'input',
    category: 'schedule',
    description: 'Count of schedule revisions to date (normalised to 0–1).',
  },
  expenditure_progress_gap: {
    key: 'expenditure_progress_gap',
    label: 'Expenditure-Progress Gap',
    shortLabel: 'Expenditure Gap',
    role: 'input',
    category: 'financial',
    description: 'Cumulative spend relative to original cost at reporting month.',
  },
  cost_revision_pressure: {
    key: 'cost_revision_pressure',
    label: 'Cost Revision Pressure',
    shortLabel: 'Cost Revisions',
    role: 'input',
    category: 'financial',
    description: 'Count of cost revisions to date (normalised to 0–1).',
  },
  forecast_cost_pressure: {
    key: 'forecast_cost_pressure',
    label: 'Forecast Cost Pressure',
    shortLabel: 'Forecast Cost',
    role: 'input',
    category: 'financial',
    description: 'Forecast cost exceeding original cost (normalised to 0–1).',
  },

  // Intermediate nodes (endogenous — computed by FCM propagation)
  schedule_pressure: {
    key: 'schedule_pressure',
    label: 'Schedule Pressure',
    shortLabel: 'Schedule Risk',
    role: 'intermediate',
    category: 'output',
    description: 'Aggregated pressure on the project schedule.',
  },
  cost_pressure: {
    key: 'cost_pressure',
    label: 'Cost Pressure',
    shortLabel: 'Cost Risk',
    role: 'intermediate',
    category: 'output',
    description: 'Aggregated pressure on project cost.',
  },

  // Output node (systemic priority)
  intervention_priority: {
    key: 'intervention_priority',
    label: 'Intervention Priority',
    shortLabel: 'Compound Risk',
    role: 'output',
    category: 'output',
    description: 'Overall propagated need for review/intervention.',
  },
};

// ── Category Definitions ────────────────────────────────────────────────────────

export const CATEGORIES = [
  {
    id: 'physical',
    label: 'Physical Progress',
    icon: '📐',
    color: 'violet',
    nodes: ['physical_progress_gap'],
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: '📅',
    color: 'sky',
    nodes: ['reported_delay_pressure', 'schedule_revision_pressure'],
  },
  {
    id: 'financial',
    label: 'Financial / Cost',
    icon: '💰',
    color: 'amber',
    nodes: ['expenditure_progress_gap', 'cost_revision_pressure', 'forecast_cost_pressure'],
  },
];

// ── Input Node Keys (ordered) ───────────────────────────────────────────────────

export const INPUT_KEYS = [
  'physical_progress_gap',
  'reported_delay_pressure',
  'schedule_revision_pressure',
  'expenditure_progress_gap',
  'cost_revision_pressure',
  'forecast_cost_pressure',
];

// ── Output Node Keys (for results display) ──────────────────────────────────────

export const OUTPUT_KEYS = ['cost_pressure', 'schedule_pressure', 'intervention_priority'];

export const OUTPUT_META = {
  cost_pressure: { label: 'Cost Risk', icon: '💰', color: 'rose' },
  schedule_pressure: { label: 'Schedule Risk', icon: '📅', color: 'amber' },
  intervention_priority: { label: 'Compound / Overall Risk', icon: '⚡', color: 'violet' },
};

// ── Authentic FCM Edges (from backend/app/fcm/fcm_weights.json) ─────────────────
//
// These 16 edges with their expert-defined weights are the EXACT relationships
// used by the backend FCM engine. None have been invented or modified.

export const FCM_EDGES = [
  { source: 'physical_progress_gap', target: 'schedule_pressure', weight: 0.7, basis: 'Expert: projects with large physical progress gaps typically face schedule overruns' },
  { source: 'physical_progress_gap', target: 'cost_pressure', weight: 0.5, basis: 'Expert: stalled physical progress leads to idle resource costs' },
  { source: 'expenditure_progress_gap', target: 'cost_pressure', weight: 0.8, basis: 'Expert: spending outpacing physical progress is the primary cost overrun signal' },
  { source: 'expenditure_progress_gap', target: 'schedule_pressure', weight: 0.4, basis: 'Expert: expenditure-progress misalignment often co-occurs with schedule problems' },
  { source: 'reported_delay_pressure', target: 'schedule_pressure', weight: 0.8, basis: 'Expert: reported delay is directly linked to schedule pressure' },
  { source: 'reported_delay_pressure', target: 'cost_pressure', weight: 0.5, basis: 'Expert: delays increase holding and idling costs' },
  { source: 'cost_revision_pressure', target: 'cost_pressure', weight: 0.9, basis: 'Expert: repeated cost revisions are a leading indicator of budget overrun' },
  { source: 'cost_revision_pressure', target: 'intervention_priority', weight: 0.6, basis: 'Expert: high revision counts trigger review protocols' },
  { source: 'schedule_revision_pressure', target: 'schedule_pressure', weight: 0.9, basis: 'Expert: repeated schedule revisions directly reflect schedule instability' },
  { source: 'schedule_revision_pressure', target: 'intervention_priority', weight: 0.6, basis: 'Expert: repeated schedule revisions signal persistent problems requiring intervention' },
  { source: 'forecast_cost_pressure', target: 'cost_pressure', weight: 0.75, basis: 'Expert: forecast cost exceeding original cost is a direct cost overrun precursor' },
  { source: 'forecast_cost_pressure', target: 'cost_revision_pressure', weight: 0.5, basis: 'Expert: forecast cost inflation often precipitates formal cost revisions' },
  { source: 'schedule_pressure', target: 'intervention_priority', weight: 0.7, basis: 'Expert: projects under schedule pressure require prioritised review' },
  { source: 'cost_pressure', target: 'intervention_priority', weight: 0.7, basis: 'Expert: projects under cost pressure require prioritised review' },
  { source: 'schedule_pressure', target: 'cost_pressure', weight: 0.4, basis: 'Expert: schedule delays create cost escalation through prolonged resource deployment' },
  { source: 'cost_pressure', target: 'schedule_pressure', weight: 0.3, basis: 'Expert: budget pressures can cause contractors to reduce staffing, slowing progress' },
];

// ── Scenario Presets ────────────────────────────────────────────────────────────
//
// These are FRONTEND-ONLY input configurations. They set slider values for the
// 6 exogenous input nodes and then call the existing /simulate/fcm endpoint.
// No new backend calculations are involved.

export const PRESETS = [
  {
    id: 'baseline',
    label: 'Baseline',
    description: 'Reset to measured project baseline values',
    overrides: {},  // Empty = use whatever baseline the backend derives
  },
  {
    id: 'cost_escalation',
    label: 'Cost Escalation',
    description: 'High cost pressure across expenditure, revisions, and forecasts',
    overrides: {
      expenditure_progress_gap: 0.85,
      cost_revision_pressure: 0.80,
      forecast_cost_pressure: 0.75,
    },
  },
  {
    id: 'schedule_delay',
    label: 'Schedule Delay',
    description: 'Significant delays and schedule revisions with progress lag',
    overrides: {
      reported_delay_pressure: 0.85,
      schedule_revision_pressure: 0.80,
      physical_progress_gap: 0.70,
    },
  },
  {
    id: 'low_physical_progress',
    label: 'Low Physical Progress',
    description: 'Major physical progress shortfall with moderate delay',
    overrides: {
      physical_progress_gap: 0.90,
      reported_delay_pressure: 0.65,
    },
  },
  {
    id: 'combined_stress',
    label: 'Combined Stress',
    description: 'Systemic crisis across all input dimensions',
    overrides: {
      physical_progress_gap: 0.85,
      reported_delay_pressure: 0.80,
      schedule_revision_pressure: 0.75,
      expenditure_progress_gap: 0.80,
      cost_revision_pressure: 0.85,
      forecast_cost_pressure: 0.75,
    },
  },
  {
    id: 'custom',
    label: 'Custom Scenario',
    description: 'Manually adjusted slider values',
    overrides: null,  // Sentinel: never applied, just displayed when manual changes occur
  },
];

// ── Category Color Mapping (Tailwind classes) ───────────────────────────────────

export const CATEGORY_STYLES = {
  physical: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800/60',
    accent: 'text-violet-600 dark:text-violet-400',
    slider: 'accent-violet-600',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  },
  schedule: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-200 dark:border-sky-800/60',
    accent: 'text-sky-600 dark:text-sky-400',
    slider: 'accent-sky-600',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  },
  financial: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/60',
    accent: 'text-amber-600 dark:text-amber-400',
    slider: 'accent-amber-600',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
};

// ── Default Baseline (for offline/demo fallback) ─────────────────────────────────

export const DEFAULT_BASELINE = {
  physical_progress_gap: 0.35,
  reported_delay_pressure: 0.28,
  schedule_revision_pressure: 0.20,
  expenditure_progress_gap: 0.42,
  cost_revision_pressure: 0.30,
  forecast_cost_pressure: 0.25,
  schedule_pressure: 0.45,
  cost_pressure: 0.48,
  intervention_priority: 0.42,
};

// ── Deterministic FCM Simulation Helper (client fallback) ─────────────────────────
//
// Uses the EXACT SAME update rule, weights, sigmoid activation, and damping
// as backend/app/fcm/engine.py:
//   anchor_i    = logit(A0_i)
//   candidate_i = sigmoid(anchor_i + sum_j W[j, i] * A_j)
//   A_next      = (1 - damping) * A + damping * candidate
//
function _sigmoid(x) {
  if (x >= 0) return 1.0 / (1.0 + Math.exp(-x));
  const e = Math.exp(x);
  return e / (1.0 + e);
}

function _logit(v) {
  const c = Math.min(Math.max(Number(v), 1e-6), 1.0 - 1e-6);
  return Math.log(c / (1.0 - c));
}

export function simulateFCMClient(initialValues = {}, overrides = {}, maxIterations = 50, tolerance = 1e-6) {
  const allNodes = [
    'physical_progress_gap',
    'reported_delay_pressure',
    'schedule_revision_pressure',
    'expenditure_progress_gap',
    'cost_revision_pressure',
    'forecast_cost_pressure',
    'schedule_pressure',
    'cost_pressure',
    'intervention_priority',
  ];
  const inputNodes = new Set(INPUT_KEYS);

  // Setup baseline
  const baseline = {};
  allNodes.forEach((k) => {
    baseline[k] = initialValues[k] ?? (DEFAULT_BASELINE[k] ?? 0.5);
  });

  // Setup scenario initial vector (overrides clamped)
  const initial = { ...baseline };
  Object.entries(overrides).forEach(([k, v]) => {
    if (v !== undefined && v !== null && inputNodes.has(k)) {
      initial[k] = Math.min(Math.max(Number(v), 0), 1);
    }
  });

  // Propagate
  const A = { ...initial };
  const damping = 0.5;
  let iterations = 0;
  let converged = false;

  for (let it = 0; it < maxIterations; it++) {
    iterations++;
    let maxDelta = 0;
    const nextA = { ...A };

    allNodes.forEach((target) => {
      if (inputNodes.has(target)) {
        nextA[target] = initial[target];
        return;
      }
      const anchor = _logit(initial[target]);
      let incoming = 0;
      FCM_EDGES.forEach((edge) => {
        if (edge.target === target) {
          incoming += edge.weight * A[edge.source];
        }
      });
      const candidate = _sigmoid(anchor + incoming);
      const updated = (1 - damping) * A[target] + damping * candidate;
      const clamped = Math.min(Math.max(updated, 0), 1);
      const delta = Math.abs(clamped - A[target]);
      if (delta > maxDelta) maxDelta = delta;
      nextA[target] = clamped;
    });

    Object.assign(A, nextA);
    if (maxDelta < tolerance) {
      converged = true;
      break;
    }
  }

  // Calculate changes
  const changes = {};
  allNodes.forEach((k) => {
    changes[k] = A[k] - baseline[k];
  });

  return {
    baseline,
    scenario: A,
    changes,
    converged,
    iterations_to_convergence: iterations,
    disclaimer: 'Expert-weighted scenario simulation; not an official model prediction or causal estimate.',
  };
}
