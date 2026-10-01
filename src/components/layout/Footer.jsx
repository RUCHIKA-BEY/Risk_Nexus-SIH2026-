export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0 select-none">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 max-w-7xl mx-auto">
        <span className="text-center sm:text-left">
          &copy; {year} Ministry of Statistics and Programme Implementation (MoSPI) — SIH 2026
        </span>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-slate-400 dark:text-slate-500 font-mono text-[10px]">
            PAIMANA v2.0 · Phase-6 Dataset
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Risk Intelligence Platform
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
