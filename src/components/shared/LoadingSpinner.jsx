/**
 * Shared Loading & Status Component for RiskNexus.
 * Uses human-readable copy and glass-consistent styling.
 */
export default function LoadingSpinner({
  label = 'RiskNexus data is loading',
  sublabel = 'Please wait…',
  size = 'md',
  className = '',
  card = false,
}) {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-10 h-10 border-[2.5px]',
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <div
        className={`
          ${sizeMap[size] || sizeMap.md}
          border-slate-200/80 dark:border-slate-700/80
          border-t-blue-600 dark:border-t-blue-400
          rounded-full
          animate-spin
        `}
      />
      {label && (
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-tight">
            {label}
          </p>
          {sublabel && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              {sublabel}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (card) {
    return (
      <div className={`glass-card rounded-xl p-8 flex items-center justify-center min-h-[220px] ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-10 ${className}`}>
      {content}
    </div>
  );
}
