import { useEffect, useState } from 'react';
import { fetchPageData } from '../services/api';

export default function Actions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPageData('Actions')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6 text-slate-500">Loading Actions...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Actions</h1>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Placeholder for {data?.title}. Loaded at {data?.loadedAt}.
        </p>
      </div>
    </div>
  );
}
