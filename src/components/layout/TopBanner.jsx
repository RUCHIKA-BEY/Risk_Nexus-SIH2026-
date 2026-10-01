import { useNavigate } from 'react-router-dom';

export default function TopBanner({ isVisible = true }) {
  const navigate = useNavigate();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 h-[68px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none ${
        isVisible ? 'translate-y-0' : '-translate-y-full pointer-events-none'
      }`}
    >
      {/* Accessible Skip Link for screen-readers / keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* Main Branding Header */}
      <div className="w-full h-full px-4 sm:px-6 flex justify-between items-center transition-colors">
        {/* Left Section — RiskNexus Logo */}
        <div
          className="flex items-center shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1"
          onClick={() => navigate('/')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/'); } }}
          aria-label="RiskNexus Home"
        >
          <img
            src="/images/risknexus_logo.png"
            alt="RiskNexus — Project Risk Intelligence for a Resilient India"
            className="h-10 sm:h-11 max-w-[200px] sm:max-w-[280px] md:max-w-none object-contain dark:brightness-110 select-none"
          />
        </div>

        {/* Right Section (Header Action Buttons) */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => navigate('/projects/all')}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white text-xs font-bold tracking-wider uppercase shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 cursor-pointer"
          >
            PROJECTS
          </button>
          <button
            onClick={() => navigate('/reports/all')}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-slate-900 to-blue-950 hover:from-slate-800 hover:to-blue-900 dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500 text-white text-xs font-bold tracking-wider uppercase shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900 cursor-pointer"
          >
            REPORTS
          </button>
        </div>
      </div>
    </header>
  );
}
