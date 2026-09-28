export default function LoadingSpinner({ label = 'Loading data…', size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 gap-3 ${className}`}>
      <div
        className={`
          ${sizeMap[size] || sizeMap.md}
          border-slate-200 dark:border-slate-700
          border-t-blue-500 dark:border-t-blue-400
          rounded-full
          animate-spin
        `}
      />
      {label && (
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
}
