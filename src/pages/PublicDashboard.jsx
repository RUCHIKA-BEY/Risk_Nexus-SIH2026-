import { useState, useEffect } from 'react';
import { Download, RefreshCw, BarChart2, PieChart as PieIcon, MapPin } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { fetchAnalyticsOverview, fetchDashboardMetrics, fetchMLProjects } from '../services/mlApi';
import SectionCard from '../components/shared/SectionCard';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function PublicDashboard() {
  const { theme } = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [sampleProjects, setSampleProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAnalyticsOverview().catch(e => { console.error(e); return null; }),
      fetchDashboardMetrics().catch(e => { console.error(e); return null; }),
      fetchMLProjects({ pageSize: 10 }).catch(e => { console.error(e); return { items: [] }; }),
    ]).then(([an, met, projs]) => {
      setAnalytics(an);
      setMetrics(met);
      setSampleProjects(projs?.items || projs?.projects || []);
      setLoading(false);
    });
  }, []);

  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const tooltipStyle = theme === 'dark'
    ? { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }
    : { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">PAIMANA</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                PUBLIC PORTAL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Infrastructure Risk Early-Warning Platform · MoSPI Central Sector Monitoring
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Download size={14} /> Print Report
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Public KPIs */}
        {loading ? (
          <div className="py-8"><LoadingSpinner /></div>
        ) : metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs">
              <p className="text-xs text-slate-500 uppercase font-medium">Monitored Projects</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics.total_projects?.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-600 mt-1">Live Phase-6 records</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs">
              <p className="text-xs text-slate-500 uppercase font-medium">Total Sanctioned Cost</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                Rs. {((metrics.total_budget || 0) / 1000).toFixed(1)}K Cr
              </p>
              <p className="text-xs text-slate-400 mt-1">Original approved budget</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs">
              <p className="text-xs text-slate-500 uppercase font-medium">Cumulative Expenditure</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                Rs. {((metrics.total_expenditure || 0) / 1000).toFixed(1)}K Cr
              </p>
              <p className="text-xs text-blue-600 mt-1">Disbursed to date</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs">
              <p className="text-xs text-slate-500 uppercase font-medium">Active Sectors</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics.sectors_count}
              </p>
              <p className="text-xs text-purple-600 mt-1">Across {metrics.states_count} states/UTs</p>
            </div>
          </div>
        ) : null}

        {/* Charts Row */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Sector-wise Budget Distribution" subtitle="Original cost by major infrastructure sector (Rs. Cr)">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.sector_distribution?.slice(0, 7) || []} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="sector" stroke={axisColor} fontSize={10} angle={-25} textAnchor="end" interval={0} />
                    <YAxis stroke={axisColor} fontSize={10} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="original_cost" fill="#3b82f6" name="Original Budget" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenditure" fill="#10b981" name="Expenditure" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Physical Progress Breakdown" subtitle="Portfolio distribution across execution stages">
              <div className="h-72 w-full flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.progress_distribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(analytics.progress_distribution || []).map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-1/2 space-y-2 pl-4 text-xs">
                  {(analytics.progress_distribution || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{item.value?.toLocaleString()}</span>
                      <span className="text-slate-500">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* State Distribution */}
        {analytics?.state_distribution && (
          <SectionCard title="Geographical Project Presence" subtitle="Project concentration across states & UTs">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {analytics.state_distribution.slice(0, 15).map((st) => (
                <div key={st.state} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{st.state}</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">{st.project_count}</p>
                  <p className="text-[10px] text-slate-500">projects monitored</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
