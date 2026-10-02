export default function SectionCard({ id, title, subtitle, children, className = '', action }) {
  return (
    <div
      id={id}
      className={`glass-card rounded-xl overflow-hidden ${className}`}
    >

      {(title || action) && (
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100/60 dark:border-slate-700/40">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0 ml-4">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

