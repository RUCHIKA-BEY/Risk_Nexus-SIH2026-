import React from 'react';

export default function TopBanner() {
  return (
    <div className="w-full flex flex-col z-50 shadow-sm shrink-0">
      {/* Top Accessibility Bar */}
      <div className="w-full bg-[#0B0F6A] px-6 py-1.5 flex justify-end items-center text-white text-xs">
        <div className="flex items-center space-x-4">
          <button className="hover:underline focus:outline-none focus:ring-1 focus:ring-white">
            Skip to main content
          </button>
          
          <div className="h-3 w-px bg-white/40" />
          
          <div className="flex items-center space-x-2 font-medium">
            <button className="hover:text-blue-200 focus:outline-none">A-</button>
            <button className="hover:text-blue-200 focus:outline-none">A</button>
            <button className="hover:text-blue-200 focus:outline-none">A+</button>
          </div>
          
          <div className="h-3 w-px bg-white/40" />
          
          {/* High contrast toggle icon */}
          <button className="hover:text-blue-200 focus:outline-none flex items-center" title="High Contrast">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Main Branding Header */}
      <div className="w-full bg-white px-6 py-3 flex justify-between items-center border-b border-slate-200">
        
        {/* Left Section (Logos & Text) */}
        <div className="flex items-center space-x-6">
          {/* Logo 1: State Emblem & Ministry Text */}
          <img src="/images/emblem.png" alt="Ministry of Statistics and Programme Implementation" className="h-12 object-contain" />

          <div className="h-10 w-px bg-slate-200" />

          {/* Logo 2: MoSPI Logo */}
          <img src="/images/mospi_logo.png" alt="MoSPI Logo" className="h-12 object-contain" />
        </div>

        {/* Right Section (Actions & PAIMANA Logo) */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <button className="px-5 py-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 text-white text-xs font-bold tracking-wide shadow-sm hover:from-orange-600 hover:to-orange-500 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
              ADD PROJECT / UPDATE
            </button>
            <button className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-900 to-[#0B0F6A] text-white text-xs font-bold tracking-wide shadow-sm hover:from-blue-800 hover:to-blue-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2">
              REPORTS
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200" />

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">SK</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 leading-tight">Sahil Kumar</span>
              <span className="text-xs text-gray-500 leading-tight">Project Analyst</span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200" />

          {/* PAIMANA Logo */}
          <img src="/images/paimana_logo.png" alt="PAIMANA Logo" className="h-8 object-contain" />
        </div>

      </div>
    </div>
  );
}
