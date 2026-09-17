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

  useEffect(() => {
    fetchAnalyticsOverview()
      .then(res => setData(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const tooltipStyle = theme === 'dark'
    ? { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }
    : { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' };

  if (loading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-slate-500">
        Failed to load analytics data from backend.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Portfolio Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Quantitative distributions derived from {data.total_observations?.toLocaleString()} monthly records across {data.total_projects?.toLocaleString()} infrastructure projects.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Cost Analysis */}
        <SectionCard title="Sector Cost Overview" subtitle="Original vs revised cost across top sectors (Rs. Cr)">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sector_distribution?.slice(0, 6) || []} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="sector" stroke={axisColor} fontSize={10} angle={-20} textAnchor="end" interval={0} />
                <YAxis stroke={axisColor} fontSize={10} />
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
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 dark:text-slate-300">{key}</span>
                    <span className="text-slate-500">{count.toLocaleString()} projects ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
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
              <LineChart data={data.cost_overview} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" stroke={axisColor} fontSize={10} />
                <YAxis stroke={axisColor} fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="expenditure" stroke="#10b981" strokeWidth={2} name="Expenditure" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="original" stroke="#3b82f6" strokeWidth={2} name="Sanctioned Budget" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
