import { useState, useEffect } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchAnalyticsOverview } from '../services/mlApi';
import SectionCard from '../components/shared/SectionCard';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function ProjectMapView() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsOverview()
      .then(res => setAnalytics(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Geographical State Distribution</h1>
        <p className="text-sm text-slate-500 mt-1">
          State-level concentration and risk vulnerability of monitored infrastructure projects.
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics?.state_distribution?.map((st) => (
            <div
              key={st.state}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-3 hover:border-blue-400 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="text-blue-500" size={18} />
                  <h3 className="font-bold text-slate-900 dark:text-white">{st.state}</h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold">
                  {st.project_count} projects
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <div>
                  <span className="text-slate-400">Total Sanctioned:</span>
                  <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    Rs. {st.original_cost ? (st.original_cost / 1e3).toFixed(1) : '0'}K Cr
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">High Risk Count:</span>
                  <p className="font-mono font-medium text-amber-600 dark:text-amber-400">
                    {st.high_risk_count || 0} flagged
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  to={`/projects/all?state=${encodeURIComponent(st.state)}`}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  View State Projects <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
