import { Filter, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line,
} from 'recharts';
import useAsyncData from '../hooks/useAsyncData';
import { useTheme } from '../context/ThemeContext';
import {
  fetchPublicKPIs, fetchSectorWiseData, fetchCostOverview,
  fetchPhysicalProgress, fetchProjectsOverview, fetchFilterOptions,
  fetchStateWiseDistribution,
} from '../services/api';
import SectionCard from '../components/shared/SectionCard';
import StatusBadge from '../components/shared/StatusBadge';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import StateWiseDistribution from '../components/shared/StateWiseDistribution';

function SectorChart({ data, theme }) {
  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const tooltipStyle = theme === 'dark'
    ? { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f1f5f9' }
    : { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#0f172a' };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="sector" stroke={axisColor} fontSize={11} angle={-15} textAnchor="end" height={60} />
        <YAxis stroke={axisColor} fontSize={11} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="original" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Original Budget" />
        <Bar dataKey="revised" fill="#16a34a" radius={[2, 2, 0, 0]} name="Revised Budget" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CostOverviewChart({ data, theme }) {
  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const tooltipStyle = theme === 'dark'
    ? { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f1f5f9' }
    : { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#0f172a' };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="month" stroke={axisColor} fontSize={11} />
        <YAxis stroke={axisColor} fontSize={11} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="expenditure" fill="#64748b" radius={[2, 2, 0, 0]} name="Expenditure" opacity={0.7} />
        <Line type="monotone" dataKey="original" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} name="Original" />
        <Line type="monotone" dataKey="revised" stroke="#dc2626" strokeWidth={2} dot={{ fill: '#dc2626', r: 3 }} name="Revised" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function ProgressPieChart({ data, theme }) {
  const tooltipStyle = theme === 'dark'
    ? { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f1f5f9' }
    : { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#0f172a' };

  return (
    <div className="flex flex-row items-center justify-between w-full h-64">
      <ResponsiveContainer width="50%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="w-1/2 flex flex-col justify-center space-y-3 pl-6">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-8">{item.value}%</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}



export default function PublicDashboard() {
  const { theme } = useTheme();
  const { data: kpis, loading: kpiLoading } = useAsyncData(fetchPublicKPIs);
  const { data: sectors, loading: sectorsLoading } = useAsyncData(fetchSectorWiseData);
  const { data: costs, loading: costsLoading } = useAsyncData(fetchCostOverview);
  const { data: progress, loading: progressLoading } = useAsyncData(fetchPhysicalProgress);
  const { data: stateData, loading: stateLoading } = useAsyncData(fetchStateWiseDistribution);
  const { data: projects, loading: projectsLoading } = useAsyncData(fetchProjectsOverview);
  const { data: filters, loading: filtersLoading } = useAsyncData(fetchFilterOptions);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">PAIMANA</h1>
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">PUBLIC PORTAL</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ministry of Statistics and Programme Implementation, Govt of India</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-sm">
              <Download size={14} /> Export PDF
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Title */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">PAIMANA Public Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Central Sector Projects Monitoring System (CSPM). Data as of September 2024.</p>
        </div>

        {/* Filters */}
        {!filtersLoading && filters && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Filter size={14} />
              <span className="font-medium">Filter Portfolio</span>
            </div>
            {Object.entries({ Sector: filters.sectors, 'Ministry / Dept': filters.ministries, 'State / UT': filters.states, 'Date Range': filters.dateRanges, 'Month': filters.months }).map(([label, options]) => (
              <div key={label} className="flex flex-col">
                <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase mb-0.5">{label}</label>
                <select className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-2 py-1.5 text-slate-600 dark:text-slate-300 min-w-[120px]">
                  {options.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Public KPIs */}
        {kpiLoading ? (
          <LoadingSpinner />
        ) : kpis ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Project Count</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{kpis.projectCount.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{kpis.projectCount.sublabel}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Original Cost</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{kpis.originalCost.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{kpis.originalCost.sublabel}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Invoice Cost</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{kpis.invoiceCost.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{kpis.invoiceCost.sublabel}</p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Cumulative Exp</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{kpis.cumulativeExp.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{kpis.cumulativeExp.sublabel}</p>
            </div>
          </div>
        ) : null}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard title="Sector-wise Budget Split" subtitle="Original vs Revised budget by sector">
            {sectorsLoading ? <LoadingSpinner /> : sectors && <SectorChart data={sectors} theme={theme} />}
          </SectionCard>
          <SectionCard title="Cost Overview (Original vs Revised vs Expenditure)" subtitle="Cumulative expenditure showing budget variations over time">
            {costsLoading ? <LoadingSpinner /> : costs && <CostOverviewChart data={costs} theme={theme} />}
          </SectionCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard title="Physical Progress Distribution" subtitle="Across all monitored projects (%)">
            {progressLoading ? <LoadingSpinner /> : progress && <ProgressPieChart data={progress} theme={theme} />}
          </SectionCard>
          {stateLoading ? <LoadingSpinner /> : <StateWiseDistribution data={stateData} />}
        </div>

        {/* Projects Overview Table */}
        <SectionCard
          title="Project Overview"
          subtitle="All monitored infrastructure projects"
        >
          {projectsLoading ? (
            <LoadingSpinner />
          ) : projects ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {['Project Name', 'Ministry', 'Last Review', 'Original Cost', 'Revised Cost', 'Expenditure', 'Physical Progress', 'Status'].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</span>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400 max-w-[180px] truncate">{p.ministry}</td>
                      <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">{p.lastReview}</td>
                      <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">Rs.{p.originalCost.toLocaleString()}</td>
                      <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">Rs.{p.revisedCost.toLocaleString()}</td>
                      <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">Rs.{p.expenditure.toLocaleString()}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-sm max-w-[60px]">
                            <div
                              className="h-full rounded-sm bg-blue-600"
                              style={{ width: `${p.physicalProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-300">{p.physicalProgress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3"><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4">Source: MoSPI Central Sector Project Monitoring System (CSPM). Data subject to revision for quarterly API integration.</p>
        </SectionCard>
      </div>
    </div>
  );
}
