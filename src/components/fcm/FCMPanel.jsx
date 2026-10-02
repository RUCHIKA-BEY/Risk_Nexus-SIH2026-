/**
 * FCMPanel — Unified What-if Scenario (FCM) dashboard component.
 *
 * Assembles the header, disclaimer, preset controls, interactive FCM network
 * graph, impact section, and comparison table into a cohesive panel.
 *
 * IMPORTANT: This component uses the EXISTING /simulate/fcm backend endpoint
 * via runFCMSimulation from services/mlApi.js. No mathematical logic, FCM
 * weights, or simulation behavior has been modified.
 */
import { useState, useCallback, useEffect } from 'react';
import { Network, Loader2, Play } from 'lucide-react';
import { runFCMSimulation } from '../../services/mlApi';
import { PRESETS, INPUT_KEYS, DEFAULT_BASELINE, simulateFCMClient } from './fcmConstants';
import FCMControls from './FCMControls';
import FCMNetworkGraph from './FCMNetworkGraph';
import FCMImpactSection from './FCMImpactSection';

// ── Disclaimer Banner (matching existing RiskAssessment style) ──────────────────

function DisclaimerBanner({ text }) {
  return (
    <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
      <span className="mt-0.5 flex-shrink-0">⚠️</span>
      <span className="leading-relaxed">{text}</span>
    </div>
  );
}

// ── Main FCMPanel ───────────────────────────────────────────────────────────────

export default function FCMPanel({ projectId, asOf }) {
  const [fcmResult, setFcmResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [activePreset, setActivePreset] = useState('baseline');
  const [hasSimulated, setHasSimulated] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState('');
  const [isFallback, setIsFallback] = useState(false);

  // ── Fetch initial baseline on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setSimulationStatus('Loading baseline…');
        if (projectId && asOf) {
          const result = await runFCMSimulation(projectId, asOf, {});
          if (!cancelled) {
            setFcmResult(result);
            setIsFallback(false);
            setSimulationStatus('');
          }
        } else {
          if (!cancelled) {
            setFcmResult(simulateFCMClient(DEFAULT_BASELINE, {}));
            setIsFallback(true);
            setSimulationStatus('');
          }
        }
      } catch (e) {
        console.warn('FCM backend baseline unavailable, using deterministic offline baseline:', e.message);
        if (!cancelled) {
          setFcmResult(simulateFCMClient(DEFAULT_BASELINE, {}));
          setIsFallback(true);
          setSimulationStatus('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, asOf]);

  // ── Run simulation ──────────────────────────────────────────────────────────
  const runSimulation = useCallback(async () => {
    setLoading(true);
    setSimulationStatus('Propagating scenario through FCM…');
    try {
      const result = await runFCMSimulation(projectId, asOf, overrides);
      setFcmResult(result);
      setIsFallback(false);
      setHasSimulated(true);
    } catch (e) {
      console.warn('FCM backend simulation unavailable, using deterministic offline simulation:', e.message);
      const fallbackResult = simulateFCMClient(fcmResult?.baseline || DEFAULT_BASELINE, overrides);
      setFcmResult(fallbackResult);
      setIsFallback(true);
      setHasSimulated(true);
    } finally {
      setLoading(false);
      setSimulationStatus('');
    }
  }, [projectId, asOf, overrides, fcmResult]);

  // ── Handle override change ──────────────────────────────────────────────────
  const handleOverrideChange = useCallback((key, value) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
    setActivePreset('custom');
  }, []);

  // ── Handle preset selection ─────────────────────────────────────────────────
  const handlePresetSelect = useCallback((presetId) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setActivePreset(presetId);

    if (presetId === 'baseline') {
      // Clear all overrides → will use baseline
      setOverrides({});
    } else {
      // Apply preset overrides on top of the current baseline
      const newOverrides = {};
      INPUT_KEYS.forEach((key) => {
        if (preset.overrides[key] !== undefined) {
          newOverrides[key] = preset.overrides[key];
        }
      });
      setOverrides(newOverrides);
    }
  }, []);

  // ── Handle reset ────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setOverrides({});
    setActivePreset('baseline');
    setHasSimulated(false);
    (async () => {
      setLoading(true);
      setSimulationStatus('Resetting to baseline…');
      try {
        if (projectId && asOf) {
          const result = await runFCMSimulation(projectId, asOf, {});
          setFcmResult(result);
          setIsFallback(false);
        } else {
          setFcmResult(simulateFCMClient(DEFAULT_BASELINE, {}));
          setIsFallback(true);
        }
      } catch (e) {
        console.warn('FCM reset backend unavailable, using default baseline:', e.message);
        setFcmResult(simulateFCMClient(DEFAULT_BASELINE, {}));
        setIsFallback(true);
      } finally {
        setLoading(false);
        setSimulationStatus('');
      }
    })();
  }, [projectId, asOf]);


  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40">
              <Network size={18} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                What-If Scenario (FCM)
                {fcmResult && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase border ${
                      isFallback 
                        ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50'
                    }`}
                    title={isFallback ? 'Backend FCM unavailable; using deterministic client-side fallback.' : 'Live FCM simulation via backend'}
                  >
                    {isFallback ? 'Local Fallback Simulation' : 'Live FCM Simulation'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Adjust input pressures and simulate systemic risk propagation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {simulationStatus && (
              <span className="text-[10px] text-violet-500 dark:text-violet-400 font-medium animate-pulse">
                {simulationStatus}
              </span>
            )}
            <button
              onClick={runSimulation}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-xs font-semibold rounded-lg
                hover:bg-violet-700 disabled:opacity-50 transition-all duration-200
                shadow-sm shadow-violet-500/20 hover:shadow-md hover:shadow-violet-500/30"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Simulating…
                </>
              ) : (
                <>
                  <Play size={14} />
                  Simulate Scenario
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="p-5 space-y-5">
        {/* Disclaimer */}
        <DisclaimerBanner
          text={fcmResult?.disclaimer || 'Expert-weighted scenario simulation; not an official model prediction or causal estimate.'}
        />

        {/* Main Layout: Controls + Network Graph */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Scenario Controls */}
          <div className="lg:col-span-4 xl:col-span-4">
            <FCMControls
              overrides={overrides}
              baseline={fcmResult?.baseline}
              activePreset={activePreset}
              onOverrideChange={handleOverrideChange}
              onPresetSelect={handlePresetSelect}
              onReset={handleReset}
            />
          </div>

          {/* Right: FCM Network Graph */}
          <div className="lg:col-span-8 xl:col-span-8">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    FCM Propagation Network
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    16 expert-weighted relationships · Hover nodes and edges for details
                  </p>
                </div>
                {fcmResult && (
                  <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md ${
                    fcmResult.converged
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${fcmResult.converged ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {fcmResult.converged ? 'Converged' : 'Not converged'}
                  </span>
                )}
              </div>
              <FCMNetworkGraph
                baseline={fcmResult?.baseline}
                scenario={hasSimulated ? fcmResult?.scenario : null}
                changes={hasSimulated ? fcmResult?.changes : null}
                isSimulated={hasSimulated}
              />
              {/* Edge legend */}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-slate-400 dark:text-slate-500">
                <span className="font-semibold">Edge Strength:</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#ef4444] rounded" /> Strong (≥0.8)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#f97316] rounded" /> Moderate (0.6–0.8)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#eab308] rounded" /> Mild (0.3–0.6)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#84cc16] rounded" /> Weak (&lt;0.3)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Convergence warning */}
        {fcmResult && !fcmResult.converged && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-700 dark:text-amber-300">
            <span>⚠</span>
            <span>FCM did not converge within the iteration limit. Results may be approximate.</span>
          </div>
        )}

        {/* Scenario Impact Section */}
        {fcmResult && (
          <FCMImpactSection fcmResult={fcmResult} />
        )}
      </div>
    </div>
  );
}
