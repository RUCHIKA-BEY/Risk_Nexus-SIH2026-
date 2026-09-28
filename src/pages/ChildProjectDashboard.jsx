import { useEffect, useState } from 'react';
import { useParams, NavLink, Outlet, Link } from 'react-router-dom';
import { fetchMLProjectDetail } from '../services/mlApi';
import { ShieldCheck, Activity, AlertTriangle, ArrowLeft, Clock, MapPin, TrendingUp, Layers } from 'lucide-react';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function ChildProjectDashboard() {
  const params = useParams();
  const projectId = params.id || params.projectId || '';
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    fetchMLProjectDetail(projectId)
      .then((data) => {
        setProject(data);
      })
      .catch((err) => {
        console.error('Project load error:', err);
        setError(err.message || 'Failed to load project');
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[400px]">
        <LoadingSpinner label={`Loading project ${projectId}…`} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link
          to="/projects/all"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ArrowLeft size={14} /> Back to All Projects
        </Link>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center space-y-3">
          <AlertTriangle className="mx-auto text-amber-500" size={36} />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {error ? 'Error Loading Project' : 'Project Not Found'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {error
              ? `Could not retrieve data for project ${projectId}. Details: ${error}`
              : `Project with ID "${projectId}" was not found in the Phase-6 database.`}
          </p>
          <Link
            to="/projects/all"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Browse All Projects
          </Link>
        </div>
      </div>
    );
  }

  const tabClasses = ({ isActive }) =>
    `px-4 py-2.5 border-b-2 font-medium text-xs transition-colors flex items-center gap-2 ${
      isActive
        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
    }`;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Link
                to="/projects/all"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Back to All Projects"
              >
                <ArrowLeft size={16} />
              </Link>
              <h1 className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {project.project_id}
              </h1>
              {project.name && (
                <span className="text-sm font-sans font-medium text-slate-600 dark:text-slate-300">
                  — {project.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
              <span>Sector: <strong className="text-slate-700 dark:text-slate-300">{project.sector || '—'}</strong></span>
              <span>•</span>
              <span>State: <strong className="text-slate-700 dark:text-slate-300">{project.state || '—'}</strong></span>
              <span>•</span>
              <span>Timeline: <strong className="text-slate-700 dark:text-slate-300">{project.available_months} months</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              project.status === 'Completed'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
            }`}>
              {project.status || 'Ongoing'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex gap-2 mt-3 -mb-4 border-t border-slate-100 dark:border-slate-800 pt-1">
          <NavLink to={`/projects/${encodeURIComponent(projectId)}/risk`} className={tabClasses}>
            <ShieldCheck size={14} /> Risk Assessment
          </NavLink>
          <NavLink to={`/projects/${encodeURIComponent(projectId)}/trajectory`} className={tabClasses}>
            <TrendingUp size={14} /> Risk Trajectory
          </NavLink>
          <NavLink to={`/projects/${encodeURIComponent(projectId)}/milestones`} className={tabClasses}>
            <Clock size={14} /> Timeline & Milestones
          </NavLink>
        </nav>
      </header>

      {/* Main Outlet */}
      <div className="flex-1">
        <Outlet context={{ project }} />
      </div>
    </div>
  );
}
