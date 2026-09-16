export default function Footer() {
  return (
    <footer className="px-6 pr-28 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>2024 Ministry of Statistics and Programme Implementation (MoSPI)</span>
        <div className="flex items-center gap-4">
          <a href="#privacy" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Privacy Policy</a>
          <span className="opacity-50">&middot;</span>
          <a href="#terms" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Terms and Conditions</a>
        </div>
      </div>
    </footer>
  );
}
