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
import IndiaInteractiveMap from '../components/shared/IndiaInteractiveMap';

// Intelligent word-wrapping for sector labels in the chart YAxis
function formatSectorLabel(label, maxCharsPerLine = 15) {
  if (!label) return [''];
  const words = label.trim().split(/\s+/);
  if (words.length === 1 || label.length <= maxCharsPerLine) {
    return [label];
  }

  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  // If more than 2 lines, cleanly combine into 2 lines
  if (lines.length > 2) {
    return [lines[0], lines.slice(1).join(' ')];
  }
  return lines;
}

function CustomSectorTick({ x, y, payload, axisColor, isMobile }) {
  const lines = formatSectorLabel(payload.value, isMobile ? 12 : 16);
  const isMultiLine = lines.length > 1;
  const fontSize = isMobile ? 9.5 : 10.5;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-8}
        y={0}
        textAnchor="end"
        fill={axisColor}
        fontSize={fontSize}
        fontWeight={500}
        className="select-none"
      >
        {lines.map((line, idx) => (
          <tspan
            key={idx}
            x={-8}
            dy={idx === 0 ? (isMultiLine ? '-0.35em' : '0.35em') : '1.15em'}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export default function PublicDashboard() {
  const { theme } = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [sampleProjects, setSampleProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    <div className="min-h-full bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Risk<span className="text-blue-600 dark:text-blue-400">Nexus</span>
              </h1>
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
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">Monitored Projects</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics.total_projects?.toLocaleString() || '13,497'}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">July 2026</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">Total Sanctioned Cost</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                Rs. {((metrics.total_budget || 0) / 1000).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K Cr
              </p>
              <p className="text-xs text-slate-400 mt-1">Original approved budget</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">Cumulative Expenditure</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                Rs. {((metrics.total_expenditure || 0) / 1000).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K Cr
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Disbursed to date</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">Active Sectors</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics.sectors_count || 25}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
                Across 36 States &amp; UTs nationwide
              </p>
            </div>
          </div>
        ) : null}

        {/* Charts Row */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sector-wise Budget Distribution (Responsive Adaptive Horizontal Bar) */}
            <SectionCard
              title="Sector-wise Budget Distribution"
              subtitle="Original budget vs. cumulative expenditure by major sector (Rs. Cr)"
            >
              <div className="h-[370px] sm:h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={analytics.sector_distribution?.slice(0, 6) || []}
                    margin={{ top: 12, right: isMobile ? 16 : 28, left: 4, bottom: 8 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis
                      type="number"
                      stroke={axisColor}
                      fontSize={isMobile ? 9 : 10}
                      tickFormatter={(val) => `₹${(val / 1000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}K Cr`}
                    />
                    <YAxis
                      type="category"
                      dataKey="sector"
                      stroke={axisColor}
                      width={isMobile ? 115 : 145}
                      interval={0}
                      tick={<CustomSectorTick axisColor={axisColor} isMobile={isMobile} />}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(label) => label}
                      formatter={(value, name) => [
                        `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`,
                        name,
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: isMobile ? '10px' : '11px', paddingTop: '8px' }} />
                    <Bar dataKey="original_cost" fill="#3b82f6" name="Original Budget" radius={[0, 4, 4, 0]} barSize={11} />
                    <Bar dataKey="expenditure" fill="#10b981" name="Expenditure" radius={[0, 4, 4, 0]} barSize={11} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            {/* Physical Progress Breakdown (Preserved Unchanged) */}
            <SectionCard title="Physical Progress Breakdown" subtitle="Portfolio distribution across execution stages">
              <div className="h-80 w-full flex items-center">
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
                <div className="w-1/2 space-y-2.5 pl-4 text-xs">
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

        {/* Geographical Project Presence — Interactive India Map */}
        {analytics?.state_distribution && (
          <SectionCard
            title="Geographical Project Presence"
            subtitle="Project concentration across states & UTs"
          >
            <IndiaInteractiveMap stateDistribution={analytics.state_distribution} />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
