import { TrendingUp, TrendingDown, Building2, IndianRupee, Layers, ShieldAlert, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import CountUpNumber from './CountUpNumber';

export const KPI_TYPE_MAP = {
  projects: {
    icon: Building2,
    color: 'blue',
    iconBg: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    border: 'border-blue-200/60 dark:border-blue-800/60',
  },
  cost: {
    icon: IndianRupee,
    color: 'green',
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200/60 dark:border-emerald-800/60',
  },
  spend: {
    icon: TrendingUp,
    color: 'cyan',
    iconBg: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200/60 dark:border-cyan-800/60',
  },
  sectors: {
    icon: Layers,
    color: 'purple',
    iconBg: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    border: 'border-purple-200/60 dark:border-purple-800/60',
  },
  risk: {
    icon: ShieldAlert,
    color: 'amber',
    iconBg: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    border: 'border-amber-200/60 dark:border-amber-800/60',
  },
  escalations: {
    icon: AlertCircle,
    color: 'red',
    iconBg: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
    border: 'border-rose-200/60 dark:border-rose-800/60',
  },
  milestones: {
    icon: Clock,
    color: 'blue',
    iconBg: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    border: 'border-blue-200/60 dark:border-blue-800/60',
  },
};

const iconBgMap = {
  blue:   'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  green:  'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  cyan:   'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
  purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  amber:  'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  red:    'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
  slate:  'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
};

export default function KPICard({
  title,
  value,
  rawTarget,
  formatter,
  duration = 2400,
  subtitle,
  change,
  trend,
  period,
  icon: PropIcon,
  type,
  color,
  loading = false,
  className = '',
  fontMono = true,
}) {
  const meta = type && KPI_TYPE_MAP[type] ? KPI_TYPE_MAP[type] : null;
  const Icon = PropIcon || meta?.icon;
  const resolvedColor = color || meta?.color || 'blue';
  const iconContainerClass = meta?.iconBg || iconBgMap[resolvedColor] || iconBgMap.slate;

  if (loading) {
    return (
      <div className={`glass-kpi rounded-xl p-4.5 animate-pulse ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24" />
          <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-32 mt-3" />
        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-20 mt-3" />
      </div>
    );
  }

  return (
    <div className={`glass-kpi rounded-xl p-4.5 transition-all duration-200 flex flex-col justify-between ${className}`}>
      {/* Top Header Row: Title & Canonical Icon Container */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
          {title}
        </p>
        {Icon && (
          <div className={`p-1.5 rounded-lg shrink-0 ${iconContainerClass}`}>
            <Icon size={16} strokeWidth={2.2} />
          </div>
        )}
      </div>

      {/* Metric Value Row */}
      <p className={`text-2xl xl:text-3xl font-black mt-2 leading-none tracking-tight text-slate-900 dark:text-white ${fontMono ? 'font-mono' : ''}`}>
        <CountUpNumber
          value={value}
          rawTarget={rawTarget}
          formatter={formatter}
          duration={duration}
        />
      </p>

      {/* Subtitle / Trend Row */}
      {subtitle ? (
        <div className="text-xs mt-2 font-medium text-slate-500 dark:text-slate-400">
          {subtitle}
        </div>
      ) : change !== undefined ? (
        <div className="flex items-center gap-1 mt-2 text-xs">
          {trend === 'up' ? (
            <TrendingUp size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <TrendingDown size={13} className="text-red-600 dark:text-red-400 shrink-0" />
          )}
          <span
            className={`font-semibold ${
              trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {change}%
          </span>
          {period && <span className="text-slate-400 dark:text-slate-500 ml-0.5">{period}</span>}
        </div>
      ) : null}
    </div>
  );
}
