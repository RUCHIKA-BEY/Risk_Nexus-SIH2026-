import { TrendingUp, TrendingDown } from 'lucide-react';

const colorMap = {
  blue:  'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/60',
  green: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/60',
  amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/60',
  red:   'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/60',
  cyan:  'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-100 dark:border-cyan-800/60',
  slate: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
};

const iconBg = {
  blue:  'bg-blue-100 dark:bg-blue-800/40 text-blue-600 dark:text-blue-400',
  green: 'bg-emerald-100 dark:bg-emerald-800/40 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-100 dark:bg-amber-800/40 text-amber-600 dark:text-amber-400',
  red:   'bg-red-100 dark:bg-red-800/40 text-red-600 dark:text-red-400',
  cyan:  'bg-cyan-100 dark:bg-cyan-800/40 text-cyan-600 dark:text-cyan-400',
  slate: 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400',
};

const valueColor = {
  blue:  'text-blue-900 dark:text-blue-100',
  green: 'text-emerald-900 dark:text-emerald-100',
  amber: 'text-amber-900 dark:text-amber-100',
  red:   'text-red-900 dark:text-red-100',
  cyan:  'text-cyan-900 dark:text-cyan-100',
  slate: 'text-slate-900 dark:text-white',
};

export default function KPICard({ title, value, change, trend, period, icon: Icon, color = 'blue', loading = false }) {
  const cardColor = colorMap[color] || colorMap.slate;
  const iconColor = iconBg[color] || iconBg.slate;
  const valColor = valueColor[color] || valueColor.slate;

  if (loading) {
    return (
      <div className={`rounded-xl border p-4 ${colorMap.slate} animate-pulse`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${cardColor}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {title}
          </p>
          <p className={`text-3xl font-black mt-1.5 leading-none ${valColor}`}>
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <TrendingUp size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <TrendingDown size={13} className="text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span
                className={`text-xs font-semibold ${
                  trend === 'up'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {change}%
              </span>
              {period && (
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-0.5">{period}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl shrink-0 ml-3 ${iconColor}`}>
            <Icon size={20} strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
}
