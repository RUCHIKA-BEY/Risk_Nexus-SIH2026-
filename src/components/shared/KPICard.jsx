import { TrendingUp, TrendingDown } from 'lucide-react';

const colorMap = {
  blue:  'bg-blue-50/70 dark:bg-blue-950/30 border-blue-100/80 dark:border-blue-800/50',
  green: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-100/80 dark:border-emerald-800/50',
  amber: 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-100/80 dark:border-amber-800/50',
  red:   'bg-red-50/70 dark:bg-red-950/30 border-red-100/80 dark:border-red-800/50',
  cyan:  'bg-cyan-50/70 dark:bg-cyan-950/30 border-cyan-100/80 dark:border-cyan-800/50',
  slate: 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/70',
};

const iconBg = {
  blue:  'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  green: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
  red:   'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
  cyan:  'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300',
  slate: 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300',
};

const valueColor = {
  blue:  'text-slate-900 dark:text-white',
  green: 'text-slate-900 dark:text-white',
  amber: 'text-slate-900 dark:text-white',
  red:   'text-slate-900 dark:text-white',
  cyan:  'text-slate-900 dark:text-white',
  slate: 'text-slate-900 dark:text-white',
};

export default function KPICard({ title, value, change, trend, period, icon: Icon, color = 'blue', loading = false }) {
  const cardColor = colorMap[color] || colorMap.slate;
  const iconColor = iconBg[color] || iconBg.slate;
  const valColor = valueColor[color] || valueColor.slate;

  if (loading) {
    return (
      <div className={`rounded-xl border p-4.5 ${colorMap.slate} animate-pulse`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4.5 transition-all duration-200 hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-600 ${cardColor}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {title}
          </p>
          <p className={`text-2xl sm:text-3xl font-extrabold mt-1.5 leading-none tracking-tight tabular-nums ${valColor}`}>
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1.5 mt-2.5">
              {trend === 'up' ? (
                <TrendingUp size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <TrendingDown size={13} className="text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span
                className={`text-xs font-semibold tabular-nums ${
                  trend === 'up'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {change}%
              </span>
              {period && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{period}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl shrink-0 ml-3 shadow-2xs ${iconColor}`}>
            <Icon size={20} strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
}
