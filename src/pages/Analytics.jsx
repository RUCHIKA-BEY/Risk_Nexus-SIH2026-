import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { fetchAnalyticsOverview } from '../services/mlApi';
import SectionCard from '../components/shared/SectionCard';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function Analytics() {
  const { theme } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetchAnalyticsOverview()
      .then(res => setData(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [retryKey]);

  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const tooltipStyle = theme === 'dark'
    ? { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: '#f1f5f9' }
    : { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' };

  if (loading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner label="Loading analytics data…" /></div>;
  }

  if (!data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-4 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-600 dark:text-rose-400">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Analytics data unavailable</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Could not connect to the backend API. Make sure the FastAPI server is running on port 8000.</p>
        </div>
        <button
          onClick={() => setRetryKey(k => k + 1)}
          className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-2xs"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Portfolio Analytics</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Quantitative distributions derived from <strong className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{data.total_observations?.toLocaleString()}</strong> monthly records across <strong className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{data.total_projects?.toLocaleString()}</strong> infrastructure projects.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Cost Analysis */}
        <SectionCard title="Sector Cost Overview" subtitle="Original vs revised cost across top sectors (Rs. Cr)">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sector_distribution?.slice(0, 6) || []} margin={{ top: 10, right: 10, left: -15, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="sector" stroke={axisColor} fontSize={10} angle={-20} textAnchor="end" interval={0} />
                <YAxis stroke={axisColor} fontSize={10} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="original_cost" fill="#3b82f6" name="Original Cost" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revised_cost" fill="#f59e0b" name="Forecast Cost" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Risk Distribution Breakdown */}
        <SectionCard title="Target Risk Distribution" subtitle="Count of projects categorized by risk vulnerability">
          <div className="space-y-4 pt-2">
            {Object.entries(data.risk_distribution || {}).map(([key, count]) => {
              const pct = ((count / (data.total_projects || 1)) * 100).toFixed(1);
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{key}</span>
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums">{count.toLocaleString()} projects ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        key.includes('Schedule') ? 'bg-amber-500' :
                        key.includes('Cost') ? 'bg-rose-500' :
                        key.includes('Compound') ? 'bg-purple-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, parseFloat(pct)))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Monthly Expenditure Trend */}
      {data.cost_overview?.length > 0 && (
        <SectionCard title="Recent Monthly Expenditure Trajectory" subtitle="Aggregated monthly expenditure trends (Rs. Thousands Cr)">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.cost_overview} margin={{ top: 10, right: 20, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" stroke={axisColor} fontSize={10} />
                <YAxis stroke={axisColor} fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="expenditure" stroke="#10b981" strokeWidth={2.5} name="Expenditure" dot={{ r: 3.5 }} />
                <Line type="monotone" dataKey="original" stroke="#3b82f6" strokeWidth={2.5} name="Sanctioned Budget" dot={{ r: 3.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
