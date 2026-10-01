export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 max-w-7xl mx-auto">
        <span>
          &copy; {year} Ministry of Statistics and Programme Implementation (MoSPI) — SIH 2026
        </span>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-slate-400 dark:text-slate-500 font-mono text-[10px]">
            PAIMANA v2.0 · Phase-6 Dataset
          </span>
          <div className="flex items-center gap-3">
            <a
              href="#privacy"
              className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Privacy Policy
            </a>
            <span className="opacity-40">·</span>
            <a
              href="#terms"
              className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
