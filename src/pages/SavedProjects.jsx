import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2, ArrowRight } from 'lucide-react';
import { fetchMLProjectDetail } from '../services/mlApi';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function SavedProjects() {
  const [savedIds, setSavedIds] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('saved_projects') || '[]');
      // Default sample bookmarks if empty
      const initialIds = stored.length > 0 ? stored : ['N22000123', 'N22000180', 'N22000215'];
      setSavedIds(initialIds);
      if (initialIds.length > 0) {
        Promise.all(initialIds.map(id => fetchMLProjectDetail(id).catch(() => null)))
          .then(results => setProjects(results.filter(Boolean)))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const removeBookmark = (id) => {
    const updated = savedIds.filter(i => i !== id);
    setSavedIds(updated);
    setProjects(projects.filter(p => p.project_id !== id));
    localStorage.setItem('saved_projects', JSON.stringify(updated));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Monitored Projects</h1>
          <p className="text-sm text-slate-500 mt-1">
            Bookmarked projects saved in your browser session for quick risk evaluation.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner
            label="Loading bookmarked projects — please wait…"
            sublabel="Retrieving stored project portfolio"
          />
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-slate-500 animate-slide-up">
          <Bookmark size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No projects saved yet</p>
          <p className="text-xs mt-1 text-slate-400">Browse All Projects and click on a project to bookmark it for monitoring.</p>
          <Link to="/projects/all" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
            Browse All Projects
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p.project_id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-300 transition-colors space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{p.project_id}</span>
                  {p.name && <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{p.name}</p>}
                  <p className="text-xs text-slate-500 mt-0.5">{p.sector || 'General'}</p>
                </div>
                <button
                  onClick={() => removeBookmark(p.project_id)}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                  title="Remove from saved"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <div>
                  <span className="text-slate-400">State:</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{p.state || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{p.status || 'Ongoing'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Timeline:</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{p.available_months} months</p>
                </div>
                <div>
                  <span className="text-slate-400">Last As-Of:</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{p.last_report_month || '—'}</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  to={`/projects/${encodeURIComponent(p.project_id)}/risk?as_of=${p.last_report_month || ''}`}
                  state={{ source: 'saved-projects', returnTo: '/projects/mine' }}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  Open Risk Assessment <ArrowRight size={12} />
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
