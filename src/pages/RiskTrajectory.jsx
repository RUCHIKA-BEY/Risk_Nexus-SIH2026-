/**
 * RiskTrajectory.jsx — Historical risk trajectory chart for a project.
 * Shows cost, schedule, compound risk scores over time from the official XGBoost models.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchRiskTrajectory, fetchMLProjectDetail, getRiskColor, RISK_DISCLAIMER } from '../services/mlApi';

function MiniSpark({ data, color, threshold }) {
  if (!data || data.length === 0) return null;
  const W = 200, H = 60, pad = 4;
  const maxScore = Math.max(...data.filter(Boolean), 1.0);
  const xStep = (W - pad * 2) / Math.max(data.length - 1, 1);
  const yScale = (H - pad * 2) / maxScore;

  const points = data.map((v, i) => [
    pad + i * xStep,
    H - pad - (v || 0) * yScale,
  ]);
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const tY = H - pad - threshold * yScale;

  return (
    <svg width={W} height={H} className="w-full h-auto">
      {/* Threshold line */}
      <line x1={pad} y1={tY} x2={W - pad} y2={tY} stroke="#94a3b8" strokeDasharray="4,2" strokeWidth="1" />
      {/* Score path */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Data points */}
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill={color} fillOpacity="0.7" />
      ))}
    </svg>
  );
}

export default function RiskTrajectory() {
  const { id: projectId } = useParams();
  const [trajectory, setTrajectory] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      fetchRiskTrajectory(projectId),
      fetchMLProjectDetail(projectId).catch(() => null),
    ]).then(([t, p]) => {
      setTrajectory(t);
      setProject(p);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Computing risk trajectory…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">{error}</div>
      </div>
    );
  }

  const points = trajectory?.points || [];
  const TARGETS = [
    { key: 'cost', scoreKey: 'cost_risk_score', classKey: 'cost_risk_class', threshold: 0.88, color: '#ef4444', label: 'Cost' },
    { key: 'schedule', scoreKey: 'schedule_risk_score', classKey: 'schedule_risk_class', threshold: 0.63, color: '#f59e0b', label: 'Schedule' },
    { key: 'compound', scoreKey: 'compound_risk_score', classKey: 'compound_risk_class', threshold: 0.885, color: '#8b5cf6', label: 'Compound' },
  ];

  const hovered = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Risk Trajectory</h1>
        <p className="text-sm text-slate-500 mt-1">
          {project?.sector || 'Project'} — {projectId} · {points.length} reporting months
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
        <span>⚠️</span><span>{RISK_DISCLAIMER} Each point uses only data available at or before that reporting month.</span>
      </div>

      {/* Sparkline summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TARGETS.map(t => {
          const scores = points.map(p => p[t.scoreKey]);
          const validScores = scores.filter(s => s !== null);
          const latest = validScores[validScores.length - 1];
          const latestClass = points[points.length - 1]?.[t.classKey];
          const highCount = points.filter(p => p[t.classKey] === 'HIGH').length;
          const colors = getRiskColor(latestClass);

          return (
            <div key={t.key} className={`bg-white dark:bg-slate-800 rounded-xl border-2 ${colors.border} p-4`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t.label} Risk</p>
                  <p className="text-2xl font-black mt-1" style={{ color: t.color }}>
                    {latest !== null && latest !== undefined ? `${(latest * 100).toFixed(1)}` : '—'}
                    <span className="text-sm font-normal text-slate-400 ml-1">pts</span>
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${colors.badge}`}>{latestClass || '—'}</span>
              </div>
              <MiniSpark data={scores} color={t.color} threshold={t.threshold} />
              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>Threshold: {(t.threshold * 100).toFixed(0)}pts</span>
                <span>{highCount} HIGH month{highCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-700 dark:text-white">Monthly Risk Scores</h3>
          <p className="text-xs text-slate-400 mt-0.5">Hover over a row to inspect. Each score is computed using only data available at that month.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-500 dark:text-slate-400">Month</th>
                {TARGETS.map(t => (
                  <th key={t.key} className="px-4 py-2.5 text-center font-semibold text-slate-500 dark:text-slate-400">
                    {t.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((pt, i) => {
                const isHovered = hoveredIdx === i;
                return (
                  <tr
                    key={i}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`border-t border-slate-100 dark:border-slate-700 transition-colors ${isHovered ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-300">
                      {pt.report_month?.slice(0, 7)}
                    </td>
                    {TARGETS.map(t => {
                      const score = pt[t.scoreKey];
                      const cls = pt[t.classKey];
                      const colors = getRiskColor(cls);
                      return (
                        <td key={t.key} className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-mono font-semibold" style={{ color: t.color }}>
                              {score !== null && score !== undefined ? `${(score * 100).toFixed(1)}` : '—'}
                            </span>
                            {cls && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${colors.badge}`}>{cls}</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {points.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No trajectory data available for this project.</p>
      )}
    </div>
  );
}
