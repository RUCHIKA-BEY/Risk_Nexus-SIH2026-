import { Calendar, RefreshCw, Package, Activity, AlertCircle } from 'lucide-react';
import useAsyncData from '../hooks/useAsyncData';
import { fetchDashboardMetrics, fetchGlobalProjects } from '../services/api';
import KPICard from '../components/shared/KPICard';
import SectionCard from '../components/shared/SectionCard';
import StatusBadge from '../components/shared/StatusBadge';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

export default function ExecutiveOverview() {
  const { data: metrics, loading: metricsLoading } = useAsyncData(fetchDashboardMetrics);
  const { data: projects, loading: projectsLoading } = useAsyncData(fetchGlobalProjects);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Portfolio &gt; Dashboard</p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Good morning, Sahil</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Overview of project statuses and key metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
              <Calendar size={14} />
              <span>Last sync: <strong>Today, 08:30 IST</strong></span>
            </div>
            <button className="p-2 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Project Health Snapshot */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Key Metrics</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Real-time overview of the portfolio</p>
          {metricsLoading ? (
            <LoadingSpinner />
          ) : metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard title="Total Projects" value={metrics.totalProjects} icon={Package} color="blue" />
              <KPICard title="Total Budget" value={metrics.totalBudget} icon={Activity} color="green" />
              <KPICard title="Active Escalations" value={metrics.activeEscalations} icon={AlertCircle} color="red" />
            </div>
          ) : null}
        </div>

        {/* Global Projects Table */}
        <SectionCard
          title="Monitored Projects"
          subtitle="Detailed overview of major infrastructure initiatives across departments"
        >
          {projectsLoading ? (
            <LoadingSpinner />
          ) : projects ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">State</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Physical Progress</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Financial Progress</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr 
                      key={project.id} 
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{project.name}</span>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{project.id}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">{project.department}</td>
                      <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">{project.state}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-sm max-w-[80px]">
                            <div
                              className="h-full rounded-sm bg-blue-600"
                              style={{ width: `${project.physicalProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-700 dark:text-slate-300">{project.physicalProgress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-sm max-w-[80px]">
                            <div
                              className="h-full rounded-sm bg-emerald-500"
                              style={{ width: `${project.financialProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-700 dark:text-slate-300">{project.financialProgress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={project.riskLevel} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
}
