/**
 * FCMControls — Scenario control panel with categorized sliders and preset selector.
 *
 * Displays the 6 exogenous FCM input nodes grouped into Physical Progress,
 * Schedule, and Financial categories. Provides preset scenario buttons and
 * a Reset Scenario action.
 *
 * IMPORTANT: This component only sets slider state. The actual FCM simulation
 * is triggered via the parent's onSimulate callback which calls the existing
 * /simulate/fcm backend endpoint.
 */
import { CATEGORIES, FCM_NODES, PRESETS, CATEGORY_STYLES } from './fcmConstants';
import { RotateCcw } from 'lucide-react';

export default function FCMControls({
  overrides,
  baseline,
  activePreset,
  onOverrideChange,
  onPresetSelect,
  onReset,
}) {
  const getValue = (key) => overrides[key] ?? (baseline?.[key] ?? 0.5);
  const getBaseline = (key) => baseline?.[key] ?? 0.5;

  return (
    <div className="space-y-4">
      {/* ── Preset Selector ─────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Scenario Presets
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => preset.id !== 'custom' && onPresetSelect(preset.id)}
                disabled={preset.id === 'custom' && activePreset !== 'custom'}
                title={preset.description}
                className={`
                  px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200
                  border
                  ${isActive
                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/20'
                    : preset.id === 'custom'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-default'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                  }
                `}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Categorized Slider Groups ───────────────────────────── */}
      {CATEGORIES.map((cat) => {
        const styles = CATEGORY_STYLES[cat.id];
        return (
          <div
            key={cat.id}
            className={`rounded-xl border ${styles.border} ${styles.bg} p-4 transition-colors duration-200`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">{cat.icon}</span>
              <span className={`text-xs font-bold uppercase tracking-wider ${styles.accent}`}>
                {cat.label}
              </span>
            </div>

            <div className="space-y-3">
              {cat.nodes.map((nodeKey) => {
                const node = FCM_NODES[nodeKey];
                const value = getValue(nodeKey);
                const baseVal = getBaseline(nodeKey);
                const delta = value - baseVal;
                const pct = (value * 100).toFixed(0);

                return (
                  <div key={nodeKey}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {node.label}
                        </span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug mt-0.5">
                          {node.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200 w-10 text-right">
                          {pct}%
                        </span>
                        {Math.abs(delta) > 0.005 && (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums ${
                              delta > 0
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                            }`}
                          >
                            {delta > 0 ? '+' : ''}{(delta * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Slider */}
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={value}
                        onChange={(e) => onOverrideChange(nodeKey, parseFloat(e.target.value))}
                        className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${styles.slider}
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
                          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-current
                          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
                          [&::-webkit-slider-thumb]:hover:scale-125
                          bg-slate-200 dark:bg-slate-700
                        `}
                        style={{
                          background: `linear-gradient(to right, currentColor ${value * 100}%, rgb(226 232 240 / 0.5) ${value * 100}%)`,
                        }}
                      />
                      {/* Baseline marker */}
                      {baseline && Math.abs(delta) > 0.005 && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-slate-400 dark:bg-slate-500 rounded-full pointer-events-none opacity-60"
                          style={{ left: `${baseVal * 100}%` }}
                          title={`Baseline: ${(baseVal * 100).toFixed(0)}%`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Reset Button ───────────────────────────────────────── */}
      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400
          hover:text-slate-700 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700
          hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50
          transition-colors duration-200"
      >
        <RotateCcw size={12} />
        Reset Scenario
      </button>
    </div>
  );
}
