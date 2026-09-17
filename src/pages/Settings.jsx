import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ShieldCheck, Database, Cpu, CheckCircle2, AlertTriangle, Key } from 'lucide-react';
import { fetchMLHealth, fetchModelsStatus } from '../services/mlApi';
import SectionCard from '../components/shared/SectionCard';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function Settings() {
  const [health, setHealth] = useState(null);
  const [modelsStatus, setModelsStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchMLHealth().catch(() => null),
      fetchModelsStatus().catch(() => null),
    ]).then(([h, m]) => {
      setHealth(h);
      setModelsStatus(m);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Diagnostics & Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">
          Backend API health, verified SHA-256 model artifacts, and pipeline operational parameters.
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backend Health Card */}
          <SectionCard title="Backend API Health" subtitle="FastAPI server connectivity and status">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <Cpu className="text-blue-500" size={18} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">API Status</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  health?.status === 'ok'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                }`}>
                  {health?.status === 'ok' ? 'Healthy (200 OK)' : 'Offline / Error'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <Database className="text-purple-500" size={18} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Model Registry Version</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  v{health?.version || '2.0.0'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="text-emerald-500" size={18} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Models Loaded in Memory</span>
                </div>
                <span className="text-xs font-semibold text-emerald-600">
                  {health?.models_loaded ? 'All Enabled Models Verified' : 'No'}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Model Registry Status Card */}
          <SectionCard title="Model Registry Invariants" subtitle="Active production, exploratory, and benchmark routing">
            <div className="space-y-2.5 text-xs">
              {modelsStatus?.models?.map((m) => (
                <div
                  key={m.model_id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{m.model_id}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.dashboard_label || m.status || m.route}</p>
                  </div>
                  <div>
                    {m.enabled ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        ENABLED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                        REJECTED / DISABLED
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
