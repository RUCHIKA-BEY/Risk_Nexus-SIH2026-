import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchHighValueProjects } from '../../services/mlApi';
import SectionCard from './SectionCard';

function formatIndianCurrency(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  const formatted = num.toLocaleString('en-IN', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  return `₹${formatted} Cr`;
}


// ── Static fallback data (real project data from canonical dataset) ──────────
// Used when the backend /projects/high-value endpoint is unavailable
// (e.g. on static Vercel deployment without backend).
const STATIC_HIGH_VALUE_PROJECTS = [
  {
    rank: 1,
    project_id: 'PAO:617321',
    name: null,
    sector: null,
    state: 'Offshore',
    agency: 'Ministry of Railways',
    status: 'Ongoing',
    observations: 2,
    last_report_month: '2025-10',
    sanctioned_cost: 150000.0,
    cumulative_expenditure: 1940.0,
  },
  {
    rank: 2,
    project_id: 'N22000463',
    name: null,
    sector: 'RAILWAYS',
    state: null,
    agency: null,
    status: 'Ongoing',
    observations: 25,
    last_report_month: '2025-03',
    sanctioned_cost: 108000.0,
    cumulative_expenditure: 72257.0,
  },
  {
    rank: 3,
    project_id: 'PAO_NAME:6b47d9ee30c289f9',
    name: null,
    sector: null,
    state: 'Tamil Nadu',
    agency: 'Chennai Metro Rail Limited [CMRL]',
    status: 'Ongoing',
    observations: 5,
    last_report_month: '2026-01',
    sanctioned_cost: 63246.0,
    cumulative_expenditure: 30721.57,
  },
  {
    rank: 4,
    project_id: 'PAO_NAME:524b373dab143ce3',
    name: null,
    sector: null,
    state: 'PAN India',
    agency: 'Department of Telecommunications [DoT]',
    status: 'Ongoing',
    observations: 6,
    last_report_month: '2026-01',
    sanctioned_cost: 61109.0,
    cumulative_expenditure: 46431.54,
  },
  {
    rank: 5,
    project_id: 'PAO_NAME:2a8a3ca18d340485',
    name: null,
    sector: null,
    state: 'Multi-States (Gujarat, Haryana, Maharashtra, Rajasthan, Uttar Pradesh)',
    agency: 'DFCCIL',
    status: 'Ongoing',
    observations: 7,
    last_report_month: '2026-01',
    sanctioned_cost: 51101.0,
    cumulative_expenditure: 124623.0,
  },
  {
    rank: 6,
    project_id: 'N02000029',
    name: null,
    sector: 'ATOMIC ENERGY',
    state: null,
    agency: null,
    status: 'Ongoing',
    observations: 19,
    last_report_month: '2024-09',
    sanctioned_cost: 49621.0,
    cumulative_expenditure: 18135.0,
  },
  {
    rank: 7,
    project_id: 'N16000518',
    name: null,
    sector: 'PETROLEUM',
    state: null,
    agency: null,
    status: 'Ongoing',
    observations: 11,
    last_report_month: '2025-03',
    sanctioned_cost: 43367.0,
    cumulative_expenditure: 1543.0,
  },
  {
    rank: 8,
    project_id: 'N16000513',
    name: null,
    sector: 'PETROLEUM',
    state: null,
    agency: null,
    status: 'Ongoing',
    observations: 14,
    last_report_month: '2025-03',
    sanctioned_cost: 43129.0,
    cumulative_expenditure: 55741.8,
  },
  {
    rank: 9,
    project_id: 'N02000028',
    name: null,
    sector: 'ATOMIC ENERGY',
    state: null,
    agency: null,
    status: 'Ongoing',
    observations: 19,
    last_report_month: '2024-09',
    sanctioned_cost: 39849.0,
    cumulative_expenditure: 45718.0,
  },
  {
    rank: 10,
    project_id: 'PAO_NAME:d5751e24220deb6b',
    name: null,
    sector: null,
    state: 'Uttarakhand',
    agency: 'RVNL - II',
    status: 'Ongoing',
    observations: 5,
    last_report_month: '2026-01',
    sanctioned_cost: 38953.0,
    cumulative_expenditure: 27545.81,
  },
  {
    rank: 11,
    project_id: 'OCMS_ROW:6ed661ad2e6ead85',
    name: null,
    sector: 'URBAN DEVELOPMENT',
    state: null,
    agency: null,
    status: 'Ongoing',
    observations: 1,
    last_report_month: '2023-12',
    sanctioned_cost: 38585.0,
    cumulative_expenditure: 40335.0,
  },
  {
    rank: 12,
    project_id: 'PAO:298178',
    name: null,
    sector: null,
    state: 'Uttar Pradesh',
    agency: '3x800 MW',
    status: 'Ongoing',
    observations: 1,
    last_report_month: '2026-07',
    sanctioned_cost: 38358.0,
    cumulative_expenditure: 1002.73,
  },
  {
    rank: 13,
    project_id: 'N16000412',
    name: null,
    sector: 'PETROLEUM',
    state: null,
    agency: null,
    status: 'Ongoing',
    observations: 25,
    last_report_month: '2025-03',
    sanctioned_cost: 34627.0,
    cumulative_expenditure: 19053.36,
  },
  {
    rank: 14,
    project_id: 'N16000247',
    name: null,
    sector: 'PETROLEUM',
    state: null,
    agency: null,
    status: 'Ongoing',
    observations: 25,
    last_report_month: '2025-03',
    sanctioned_cost: 34012.0,
    cumulative_expenditure: 32565.18,
  },
  {
    rank: 15,
    project_id: 'N22000627',
    name: null,
    sector: 'RAILWAYS',
    state: null,
    agency: null,
    status: 'Ongoing',
    observations: 14,
    last_report_month: '2025-03',
    sanctioned_cost: 33690.0,
    cumulative_expenditure: 1110.28,
  },
  {
    rank: 16,
    project_id: 'PAO_NAME:d1f1c233885e7071',
    name: null,
    sector: null,
    state: 'Delhi',
    agency: 'National Buildings Construction Corporation [NBCC]',
    status: 'Ongoing',
    observations: 5,
    last_report_month: '2026-01',
    sanctioned_cost: 32850.0,
    cumulative_expenditure: 12339.04,
  },
  {
    rank: 17,
    project_id: 'N18000362',
    name: null,
    sector: 'POWER',
    state: null,
    agency: null,
    status: 'Ongoing',
    observations: 21,
    last_report_month: '2025-03',
    sanctioned_cost: 31876.39,
    cumulative_expenditure: 3182.93,
  },
  {
    rank: 18,
    project_id: 'N16000434',
    name: null,
    sector: 'PETROLEUM',
    state: null,
    agency: null,
    status: 'Ongoing',
    observations: 25,
    last_report_month: '2025-03',
    sanctioned_cost: 31580.0,
    cumulative_expenditure: 1320.41,
  },
  {
    rank: 19,
    project_id: 'N28000134',
    name: null,
    sector: 'URBAN DEVELOPMENT',
    state: null,
    agency: null,
    status: 'Ongoing',
    observations: 25,
    last_report_month: '2025-03',
    sanctioned_cost: 30274.0,
    cumulative_expenditure: 24993.22,
  },
  {
    rank: 20,
    project_id: 'PAO_NAME:eba92e7ec6ee593f',
    name: null,
    sector: null,
    state: 'Bihar',
    agency: 'National Thermal Power Corporation [NTPC]',
    status: 'Ongoing',
    observations: 3,
    last_report_month: '2026-07',
    sanctioned_cost: 29948.0,
    cumulative_expenditure: 3422.25,
  },
];

export default function HighValueProjectsSection() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchHighValueProjects(20)
      .then((res) => {
        const items = res.items || [];
        setProjects(items.length > 0 ? items : STATIC_HIGH_VALUE_PROJECTS);
        setLoading(false);
      })
      .catch(() => {
        // Fallback to embedded static data when backend is unavailable
        console.info('[HighValueProjects] API unavailable — using static dataset');
        setProjects(STATIC_HIGH_VALUE_PROJECTS);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const getNavState = () => ({
    source: 'public-dashboard',
    returnTo: '/',
    restoreScrollY: document.getElementById('main-content')?.scrollTop || 0,
    restoreSection: 'high-value',
  });

  return (
    <SectionCard
      id="high-value-projects-section"
      title="HIGH-VALUE PROJECTS"
      subtitle="Top 20 projects by sanctioned project cost"
      badge="CANONICAL PORTFOLIO"
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <p>
            Showing the latest available portfolio data for the highest-value monitored projects. Ranked strictly by sanctioned cost descending.
          </p>
          <span className="shrink-0 font-medium text-slate-600 dark:text-slate-300">
            {projects.length > 0 ? `Showing Top ${projects.length} Unique Projects` : ''}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-600 dark:border-cyan-500/30 dark:border-t-cyan-400 animate-spin" />
            <p className="text-xs font-medium">Loading high-value projects…</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Aggregating latest project snapshots from canonical dataset</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="py-12 px-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col items-center justify-center text-center gap-3">
            <AlertCircle className="text-rose-600 dark:text-rose-400" size={24} />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">Unable to load high-value project data.</p>
              <p className="text-xs text-rose-700/80 dark:text-rose-300/80">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition-colors"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
            No high-value project data available.
          </div>
        )}

        {/* Loaded Content: Exact RiskNexus Project Table */}
        {!loading && !error && projects.length > 0 && (
          <>
            {/* Desktop / Tablet Full Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Project ID</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Sector</th>
                    <th className="py-3.5 px-4 min-w-[180px]">State / Agency</th>
                    <th className="py-3.5 px-4 min-w-[90px]">Status</th>
                    <th className="py-3.5 px-4 min-w-[100px]">Observations</th>
                    <th className="py-3.5 px-4 min-w-[110px]">Latest Month</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px]">Sanctioned Cost</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px]">Cumulative Spend</th>
                    <th className="py-3.5 px-4 text-right min-w-[90px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {projects.map((proj) => {
                    const rankFormatted = String(proj.rank).padStart(2, '0');
                    const hasSpend = proj.cumulative_expenditure !== null && proj.cumulative_expenditure !== undefined;
                    const hasCost = proj.sanctioned_cost !== null && proj.sanctioned_cost !== undefined;

                    return (
                      <tr
                        key={proj.project_id}
                        className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                          {rankFormatted}
                        </td>

                        {/* Project ID */}
                        <td className="py-3.5 px-4">
                          <Link
                            to={`/projects/${encodeURIComponent(proj.project_id)}/risk?as_of=${proj.last_report_month || ''}`}
                            state={getNavState()}
                            className="font-mono font-semibold text-blue-600 dark:text-cyan-400 hover:underline inline-block truncate max-w-[220px]"
                            title={proj.project_id}
                          >
                            {proj.project_id}
                          </Link>
                          {proj.name && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans truncate max-w-[220px] mt-0.5">
                              {proj.name}
                            </div>
                          )}
                        </td>

                        {/* Sector */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                          {proj.sector || '—'}
                        </td>

                        {/* State / Agency */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {proj.state || proj.agency ? (
                            <>
                              <div className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]" title={proj.state || '—'}>
                                {proj.state || '—'}
                              </div>
                              {proj.agency && (
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[180px]" title={proj.agency}>
                                  {proj.agency}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            proj.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-cyan-300'
                          }`}>
                            {proj.status || 'Ongoing'}
                          </span>
                        </td>

                        {/* Observations */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {proj.observations || '—'}
                        </td>

                        {/* Latest Month */}
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {proj.last_report_month || '—'}
                        </td>

                        {/* Sanctioned Cost */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-cyan-300">
                          {hasCost ? formatIndianCurrency(proj.sanctioned_cost) : '—'}
                        </td>

                        {/* Cumulative Spend */}
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {hasSpend ? formatIndianCurrency(proj.cumulative_expenditure) : '—'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to={`/projects/${encodeURIComponent(proj.project_id)}/risk?as_of=${proj.last_report_month || ''}`}
                            state={getNavState()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-cyan-300 transition-colors"
                          >
                            <span>View</span>
                            <ArrowUpRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View (visible on < 768px screens) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {projects.map((proj) => {
                const rankFormatted = String(proj.rank).padStart(2, '0');
                const hasSpend = proj.cumulative_expenditure !== null && proj.cumulative_expenditure !== undefined;
                const hasCost = proj.sanctioned_cost !== null && proj.sanctioned_cost !== undefined;

                return (
                  <div
                    key={proj.project_id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                          #{rankFormatted}
                        </span>
                        <Link
                          to={`/projects/${encodeURIComponent(proj.project_id)}/risk?as_of=${proj.last_report_month || ''}`}
                          state={getNavState()}
                          className="font-mono text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline truncate max-w-[180px]"
                        >
                          {proj.project_id}
                        </Link>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        proj.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-cyan-300'
                      }`}>
                        {proj.status || 'Ongoing'}
                      </span>
                    </div>

                    {proj.name && (
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {proj.name}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{proj.sector || '—'}</span>
                      <span>•</span>
                      <span>{proj.state || '—'}</span>
                      {proj.agency && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400">{proj.agency}</span>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Sanctioned Cost</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-cyan-300">
                          {hasCost ? formatIndianCurrency(proj.sanctioned_cost) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Cumulative Spend</div>
                        <div className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {hasSpend ? formatIndianCurrency(proj.cumulative_expenditure) : '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span>Observations: </span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {proj.observations || '—'}
                        </span>
                      </div>
                      <div>
                        <span>Latest: </span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {proj.last_report_month || '—'}
                        </span>
                      </div>
                      <Link
                        to={`/projects/${encodeURIComponent(proj.project_id)}/risk?as_of=${proj.last_report_month || ''}`}
                        state={getNavState()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline ml-auto"
                      >
                        <span>View</span>
                        <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}



