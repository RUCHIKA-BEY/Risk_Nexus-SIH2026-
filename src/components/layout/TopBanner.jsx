import { useNavigate } from 'react-router-dom';

export default function TopBanner({ isVisible = true }) {
  const navigate = useNavigate();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 h-[68px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none ${
        isVisible ? 'translate-y-0' : '-translate-y-full pointer-events-none'
      }`}
    >
      {/* Unobtrusive Accessible Skip Link for screen-readers / keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* Main Branding Header */}
      <div className="w-full h-full px-6 flex justify-between items-center transition-colors">
        {/* Left Section — RiskNexus Logo */}
        <div className="flex items-center shrink-0 cursor-pointer" onClick={() => navigate('/')}>
          <img
            src="/images/risknexus_logo.png"
            alt="RiskNexus — Project Risk Intelligence for a Resilient India"
            className="h-11 max-w-[220px] sm:max-w-[280px] md:max-w-none object-contain dark:brightness-110"
          />
        </div>

        {/* Right Section (Header Action Buttons) */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => navigate('/projects/all')}
            className="px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 text-white text-xs font-bold tracking-wide shadow-sm hover:from-orange-600 hover:to-orange-500 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            PROJECTS
          </button>
          <button
            onClick={() => navigate('/reports/all')}
            className="px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-blue-900 to-[#0B0F6A] text-white text-xs font-bold tracking-wide shadow-sm hover:from-blue-800 hover:to-blue-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
          >
            REPORTS
          </button>
        </div>
      </div>
    </header>
  );
}
