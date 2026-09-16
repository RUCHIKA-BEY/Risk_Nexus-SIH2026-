import React from 'react';
import { useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';

export default function PendingIntegrationView() {
  const location = useLocation();
  // Parse path for display name
  const pathParts = location.pathname.split('/').filter(Boolean);
  const routeName = pathParts.length 
    ? pathParts[pathParts.length - 1].replace(/-/g, ' ').toUpperCase()
    : 'PAGE';

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 m-6 shadow-sm">
      <Settings className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-4 animate-spin-slow" />
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-wide">{routeName}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">Awaiting backend data integration.</p>
    </div>
  );
}
