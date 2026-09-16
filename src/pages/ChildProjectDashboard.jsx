import { useEffect, useState } from 'react';
import { useParams, NavLink, Outlet } from 'react-router-dom';
import { fetchProjectDetails } from '../services/api';
import { Activity, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import StatusBadge from '../components/shared/StatusBadge';

export default function ChildProjectDashboard() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchProjectDetails(id)
      .then(setProject)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-6 text-slate-500">Loading Project Details...</div>;
  }

  if (!project) {
    return <div className="p-6 text-slate-500">Project not found.</div>;
  }

  const tabClasses = ({ isActive }) =>
    `px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
      isActive
        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
    }`;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {project.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Project ID: {project.id} | Department: {project.department} | State: {project.state}
            </p>
          </div>
          <div className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded text-sm font-medium border border-amber-200 dark:border-amber-800">
            Progress: {project.physicalProgress}%
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        
        {/* Tabbed Navigation */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <nav className="flex border-b border-slate-200 dark:border-slate-700 px-2 pt-2">
            <NavLink to="progress" className={tabClasses}>Progress</NavLink>
            <NavLink to="milestones" className={tabClasses}>Milestones</NavLink>
            <NavLink to="map" className={tabClasses}>Map</NavLink>
          </nav>
          <div className="p-4 min-h-[200px]">
            <Outlet />
          </div>
        </div>

        {/* Project Health Module */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              AI Insights
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {project.predictedCostEscalation > 0 
                ? `AI models predict a potential cost escalation of ${project.predictedCostEscalation}% for this project based on current financial and physical progress trends.`
                : 'AI models currently project stable financial delivery. No significant cost escalations are predicted.'}
            </p>
          </div>
          <div className={`bg-white dark:bg-slate-800 border-l-4 border-y border-r border-slate-200 dark:border-y-slate-700 dark:border-r-slate-700 p-4 shadow-sm ${project.riskLevel === 'Critical' ? 'border-l-rose-500' : project.riskLevel === 'High' ? 'border-l-orange-500' : 'border-l-emerald-500'}`}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle size={18} className={project.riskLevel === 'Critical' ? 'text-rose-500' : project.riskLevel === 'High' ? 'text-orange-500' : 'text-emerald-500'} />
                Risk Alerts
              </h2>
              <StatusBadge status={project.riskLevel} />
            </div>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              {project.riskLevel === 'Critical' && (
                <li>• Major delays detected. Immediate intervention required to prevent cascading schedule slips.</li>
              )}
              {project.riskLevel === 'High' && (
                <li>• Potential bottleneck identified in upcoming milestones. Monitor closely.</li>
              )}
              {(project.riskLevel === 'Medium' || project.riskLevel === 'Low') && (
                <li>• Project is currently tracking within acceptable risk parameters.</li>
              )}
            </ul>
          </div>
        </section>

        {/* Actions Module */}
        <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            Actions
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Review Resource Allocation</p>
                <p className="text-xs text-slate-500">Pending approval from Lead Engineer</p>
              </div>
              <button className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors">
                Take Action
              </button>
            </div>
          </div>
        </section>

        {/* Auto Report Trigger */}
        <section className="flex justify-end pt-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium rounded hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors shadow-sm">
            <FileText size={16} />
            Generate Auto Report
          </button>
        </section>
      </div>
    </div>
  );
}
