export default function SectionCard({ title, subtitle, children, className = '', action }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden ${className}`}
    >
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 gap-2">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0 sm:ml-4 self-start sm:self-center">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
