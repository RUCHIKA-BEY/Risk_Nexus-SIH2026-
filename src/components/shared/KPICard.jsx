import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPICard({ title, value, change, trend, period, icon: Icon, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800',
    slate: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
  };

  const iconColorMap = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    cyan: 'text-cyan-600 dark:text-cyan-400',
    slate: 'text-slate-600 dark:text-slate-400',
  };

  return (
    <div className={`rounded border p-4 ${colorMap[color] || colorMap.slate}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown size={14} className="text-red-600 dark:text-red-400" />
              )}
              <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {change}%
              </span>
              {period && <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">{period}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-2 rounded-sm bg-white/60 dark:bg-slate-800/60 ${iconColorMap[color] || iconColorMap.slate}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
