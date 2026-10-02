/**
 * FCMImpactSection — Scenario impact cards and baseline vs scenario comparison.
 *
 * Displays the 3 key output metrics (Cost Risk, Schedule Risk, Compound Risk)
 * with baseline → scenario transitions, and a detailed comparison table for
 * all 9 FCM concepts.
 *
 * All values come from the existing FCMSimulationResponse. No values are invented.
 */
import { FCM_NODES, OUTPUT_KEYS, OUTPUT_META, INPUT_KEYS } from './fcmConstants';

// ── Impact Card ─────────────────────────────────────────────────────────────────

function ImpactCard({ nodeKey, baseline, scenario, change }) {
  const meta = OUTPUT_META[nodeKey];
  const basePct = (baseline * 100).toFixed(1);
  const scenPct = (scenario * 100).toFixed(1);
  const changePct = (change * 100).toFixed(1);
  const isIncrease = change > 0.005;
  const isDecrease = change < -0.005;

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 p-5 transition-all duration-300 hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{meta.icon}</span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {meta.label}
          </p>
        </div>
      </div>

      {/* Baseline → Scenario */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg font-bold tabular-nums text-slate-500 dark:text-slate-400">
          {basePct}%
        </span>
        <span className="text-slate-400 dark:text-slate-500">→</span>
        <span className={`text-2xl font-extrabold tabular-nums ${
          isIncrease ? 'text-rose-600 dark:text-rose-400' :
          isDecrease ? 'text-emerald-600 dark:text-emerald-400' :
          'text-slate-600 dark:text-slate-300'
        }`}>
          {scenPct}%
        </span>
      </div>

      {/* Change badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
          isIncrease
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
            : isDecrease
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          {isIncrease ? '↑' : isDecrease ? '↓' : '='} {isIncrease ? '+' : ''}{changePct}%
        </span>
        <span className="text-[10px] text-slate-400">
          {isIncrease ? 'Escalated' : isDecrease ? 'Relieved' : 'Stable'}
        </span>
      </div>

      {/* Progress bar comparison */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 w-14 shrink-0">Baseline</span>
          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-slate-400 dark:bg-slate-500 transition-all duration-500"
              style={{ width: `${Math.min(100, baseline * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 w-14 shrink-0">Scenario</span>
          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden relative">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                isIncrease ? 'bg-rose-500' : isDecrease ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
              style={{ width: `${Math.min(100, scenario * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Comparison Table ────────────────────────────────────────────────────────────

function ComparisonTable({ baseline, scenario, changes, converged, iterations }) {
  const allKeys = [...INPUT_KEYS, ...OUTPUT_KEYS];

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/80">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Baseline vs Scenario — Full Comparison
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50">
              <th className="px-4 py-2.5 text-left font-semibold text-slate-500 dark:text-slate-400">Concept</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-500 dark:text-slate-400">Role</th>
              <th className="px-4 py-2.5 text-right font-semibold text-slate-500 dark:text-slate-400">Baseline</th>
              <th className="px-4 py-2.5 text-right font-semibold text-slate-500 dark:text-slate-400">Scenario</th>
              <th className="px-4 py-2.5 text-right font-semibold text-slate-500 dark:text-slate-400">Change</th>
              <th className="px-4 py-2.5 text-center font-semibold text-slate-500 dark:text-slate-400">Trend</th>
            </tr>
          </thead>
          <tbody>
            {allKeys.map((key) => {
              const node = FCM_NODES[key];
              if (!node) return null;
              const b = baseline?.[key] ?? 0;
              const s = scenario?.[key] ?? 0;
              const c = changes?.[key] ?? 0;
              const isOutput = node.role !== 'input';

              return (
                <tr
                  key={key}
                  className={`border-t border-slate-100 dark:border-slate-700/60 ${
                    isOutput ? 'bg-violet-50/30 dark:bg-violet-950/10' : ''
                  } hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">
                    {node.label}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      node.role === 'input'
                        ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        : node.role === 'intermediate'
                          ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300'
                          : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                    }`}>
                      {node.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {(b * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                    {(s * 100).toFixed(1)}%
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${
                    c > 0.005 ? 'text-rose-600 dark:text-rose-400' :
                    c < -0.005 ? 'text-emerald-600 dark:text-emerald-400' :
                    'text-slate-400'
                  }`}>
                    {c > 0 ? '+' : ''}{(c * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-sm ${
                      c > 0.005 ? 'text-rose-500' : c < -0.005 ? 'text-emerald-500' : 'text-slate-400'
                    }`}>
                      {c > 0.005 ? '↑' : c < -0.005 ? '↓' : '='}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Simulation metadata footer */}
      <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${converged ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {converged ? 'Converged' : 'Not converged'}
        </span>
        {iterations != null && (
          <span>{iterations} iteration{iterations !== 1 ? 's' : ''}</span>
        )}
        <span>Damping: 0.5</span>
        <span>Activation: sigmoid</span>
      </div>
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────────

export default function FCMImpactSection({ fcmResult }) {
  if (!fcmResult) return null;

  const { baseline, scenario, changes, converged, iterations_to_convergence } = fcmResult;

  return (
    <div className="space-y-4">
      {/* ── Impact Cards ─────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Scenario Impact
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {OUTPUT_KEYS.map((key) => (
            <ImpactCard
              key={key}
              nodeKey={key}
              baseline={baseline?.[key] ?? 0}
              scenario={scenario?.[key] ?? 0}
              change={changes?.[key] ?? 0}
            />
          ))}
        </div>
      </div>

      {/* ── Comparison Table ──────────────────────────── */}
      <ComparisonTable
        baseline={baseline}
        scenario={scenario}
        changes={changes}
        converged={converged}
        iterations={iterations_to_convergence}
      />
    </div>
  );
}
