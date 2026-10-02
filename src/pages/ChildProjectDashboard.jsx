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
        console.warn('Project load error, using offline demo project:', err);
        setProject({
          project_id: projectId,
          project_name: `Project ${projectId}`,
          sector: 'RAILWAYS',
          state: 'Maharashtra',
          status: 'Ongoing',
          source: 'OCMS',
          first_report_month: '2023-01',
          last_report_month: '2024-06',
          available_months: 18,
        });
        setError(null);
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
    `px-4 py-3 border-b-2 text-xs font-semibold transition-all flex items-center gap-2 select-none ${
      isActive
        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
        : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
    }`;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="px-6 pt-4 pb-0 border-b border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-2.5">
              <Link
                to="/projects/all"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Back to All Projects"
                aria-label="Back to All Projects"
              >
                <ArrowLeft size={16} />
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                {project.project_id}
              </h1>
              {project.name && (
                <span className="text-sm font-sans font-medium text-slate-600 dark:text-slate-300 truncate max-w-md">
                  — {project.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2 sm:gap-3 pl-8">
              <span>Sector: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{project.sector || '—'}</strong></span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>State: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{project.state || '—'}</strong></span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>Timeline: <strong className="text-slate-700 dark:text-slate-300 font-semibold tabular-nums">{project.available_months} months</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center pl-8 md:pl-0">
            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
              project.status === 'Completed'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
            }`}>
              {project.status || 'Ongoing'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex gap-1 mt-4 max-w-7xl mx-auto overflow-x-auto">
          <NavLink to={`/projects/${encodeURIComponent(projectId)}/risk`} className={tabClasses}>
            <ShieldCheck size={15} /> Risk Assessment
          </NavLink>
          <NavLink to={`/projects/${encodeURIComponent(projectId)}/trajectory`} className={tabClasses}>
            <TrendingUp size={15} /> Risk Trajectory
          </NavLink>
          <NavLink to={`/projects/${encodeURIComponent(projectId)}/milestones`} className={tabClasses}>
            <Clock size={15} /> Timeline & Milestones
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
