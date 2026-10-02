import { memo } from 'react';

/**
 * HeroRadar — Coherent Infrastructure Network & Intelligence Radar
 * 
 * Visualizes a miniature, interconnected national infrastructure ecosystem
 * (buildings, arterial highway, railway transit corridor, bridge overpass, and telemetry nodes)
 * analyzed by a scanning intelligence radar.
 * 
 * Performance: Lightweight SVG + GPU hardware-accelerated CSS transforms.
 */
function HeroRadar({ isHovered = false, className = '' }) {
  // 6 connected infrastructure telemetry nodes across key network junctions
  const networkNodes = [
    { id: 'spire', cx: 131, cy: 64, r: 2.2, label: 'High-Rise Spire' },
    { id: 'hub', cx: 104, cy: 112, r: 2.5, label: 'Central Transit Hub' },
    { id: 'junction', cx: 66, cy: 84, r: 2.2, label: 'Rail-Highway Junction' },
    { id: 'portal', cx: 34, cy: 134, r: 2.0, label: 'West Expressway Portal' },
    { id: 'terminal', cx: 160, cy: 106, r: 2.0, label: 'East Terminal' },
    { id: 'bridge', cx: 112, cy: 90, r: 2.2, label: 'Bridge Connector' },
  ];

  return (
    <div
      aria-hidden="true"
      className={`relative select-none flex flex-col items-center justify-center ${className}`}
    >
      {/* Radar Outer Circular Container */}
      <div className="relative w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 lg:w-80 lg:h-80 xl:w-[360px] xl:h-[360px] rounded-full flex items-center justify-center overflow-hidden">
        {/* Soft Radial Ambient Depth */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent dark:from-cyan-950/45 dark:via-blue-950/35 dark:to-transparent pointer-events-none" />

        {/* ── SVG LAYER: Grid, Rings, and Connected Miniature Infrastructure Network ── */}
        <svg
          className="absolute inset-0 w-full h-full text-slate-400 dark:text-cyan-400"
          viewBox="0 0 200 200"
          fill="none"
        >
          <defs>
            {/* Building gradient fills */}
            <linearGradient id="buildingGradMain" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.65" />
            </linearGradient>
            <linearGradient id="buildingGradSec" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
            </linearGradient>

            {/* Road gradient */}
            <linearGradient id="roadGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
            </linearGradient>

            {/* Rail gradient */}
            <linearGradient id="railGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* ── BACK LAYER: Radar Polar Grid & Concentric Intelligence Rings ── */}
          <g opacity="0.38">
            {/* Crosshair Axes & Diagonals */}
            <line x1="100" y1="10" x2="100" y2="190" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 3" />
            <line x1="10" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 3" />
            <line x1="36" y1="36" x2="164" y2="164" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />
            <line x1="164" y1="36" x2="36" y2="164" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />

            {/* 4 Concentric Calibration Rings */}
            <circle cx="100" cy="100" r="26" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
            <circle cx="100" cy="100" r="52" stroke="currentColor" strokeWidth="0.8" opacity="0.6" strokeDasharray="3 2" />
            <circle cx="100" cy="100" r="76" stroke="currentColor" strokeWidth="0.9" opacity="0.5" />
            <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1.1" opacity="0.7" />

            {/* Calibration tick marks on outer ring */}
            <line x1="100" y1="7" x2="100" y2="11" stroke="currentColor" strokeWidth="1.2" />
            <line x1="100" y1="189" x2="100" y2="193" stroke="currentColor" strokeWidth="1.2" />
            <line x1="7" y1="100" x2="11" y2="100" stroke="currentColor" strokeWidth="1.2" />
            <line x1="189" y1="100" x2="193" y2="100" stroke="currentColor" strokeWidth="1.2" />
          </g>

          {/* ── MIDDLE LAYER: Coherent Connected Miniature Infrastructure Ecosystem ── */}

          {/* 1. ARTERIAL HIGHWAY / ROAD NETWORK (Connecting West portal to Central Hub & East Boulevard) */}
          <g className="transition-opacity duration-300">
            {/* Road Surface Fill */}
            <path
              d="M 22,140 C 48,128 76,118 102,110 C 126,104 148,106 168,108 L 169,114 C 147,112 125,110 100,116 C 74,124 46,135 24,146 Z"
              fill="rgba(6, 182, 212, 0.08)"
              className="dark:fill-cyan-500/10"
            />
            {/* Outer Road Boundary Lines */}
            <path
              d="M 22,140 C 48,128 76,118 102,110 C 126,104 148,106 168,108"
              stroke="url(#roadGrad)"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M 24,146 C 46,135 74,124 100,116 C 125,110 147,112 169,114"
              stroke="url(#roadGrad)"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            {/* Dashed Center Lane Divider */}
            <path
              d="M 23,143 C 47,131.5 75,121 101,113 C 125.5,107 147.5,109 168.5,111"
              stroke="#38bdf8"
              strokeWidth="0.65"
              strokeDasharray="2.5 3"
              opacity="0.8"
            />
          </g>

          {/* 2. RAILWAY TRANSIT CORRIDOR (Diagonal branch leading into Central Hub) */}
          <g className="transition-opacity duration-300">
            {/* Parallel Rails */}
            <line x1="30" y1="52" x2="96" y2="110" stroke="url(#railGrad)" strokeWidth="1.0" />
            <line x1="35" y1="57" x2="101" y2="115" stroke="url(#railGrad)" strokeWidth="1.0" />
            {/* Evenly Spaced Sleepers / Crossbars */}
            <line x1="32" y1="53" x2="36" y2="58" stroke="currentColor" strokeWidth="0.6" opacity="0.75" />
            <line x1="41" y1="61" x2="45" y2="66" stroke="currentColor" strokeWidth="0.6" opacity="0.75" />
            <line x1="50" y1="69" x2="54" y2="74" stroke="currentColor" strokeWidth="0.6" opacity="0.75" />
            <line x1="59" y1="77" x2="63" y2="82" stroke="currentColor" strokeWidth="0.6" opacity="0.75" />
            <line x1="68" y1="85" x2="72" y2="90" stroke="currentColor" strokeWidth="0.6" opacity="0.75" />
            <line x1="77" y1="93" x2="81" y2="98" stroke="currentColor" strokeWidth="0.6" opacity="0.75" />
            <line x1="86" y1="101" x2="90" y2="106" stroke="currentColor" strokeWidth="0.6" opacity="0.75" />
            <line x1="94" y1="108" x2="98" y2="113" stroke="currentColor" strokeWidth="0.6" opacity="0.75" />
          </g>

          {/* 3. ELEVATED CONNECTOR / BRIDGE OVERPASS */}
          <g opacity="0.85">
            {/* Bridge Deck Arch */}
            <path d="M 86,96 Q 112,84 138,96" stroke="#06b6d4" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            {/* Bridge Support Pylons */}
            <line x1="98" y1="91" x2="98" y2="108" stroke="#38bdf8" strokeWidth="0.9" opacity="0.8" />
            <line x1="112" y1="84" x2="112" y2="104" stroke="#38bdf8" strokeWidth="1.2" />
            <line x1="126" y1="91" x2="126" y2="104" stroke="#38bdf8" strokeWidth="0.9" opacity="0.8" />
            {/* Suspension Cable Hints */}
            <line x1="112" y1="84" x2="98" y2="91" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
            <line x1="112" y1="84" x2="126" y2="91" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          </g>

          {/* 4. GEOMETRIC BUILDING CLUSTER (Vector & Isometric Silhouettes) */}
          <g opacity="0.9">
            {/* Building 1: Commercial Tech Block */}
            <rect x="108" y="86" width="11" height="22" fill="url(#buildingGradMain)" stroke="currentColor" strokeWidth="0.8" rx="0.5" />
            <line x1="111" y1="90" x2="116" y2="90" stroke="#38bdf8" strokeWidth="0.5" opacity="0.8" />
            <line x1="111" y1="95" x2="116" y2="95" stroke="#38bdf8" strokeWidth="0.5" opacity="0.8" />
            <line x1="111" y1="100" x2="116" y2="100" stroke="#38bdf8" strokeWidth="0.5" opacity="0.8" />

            {/* Building 2: Central Tower with Antenna Spire */}
            <rect x="123" y="70" width="15" height="38" fill="url(#buildingGradMain)" stroke="currentColor" strokeWidth="0.9" rx="0.5" />
            <line x1="130.5" y1="64" x2="130.5" y2="70" stroke="#06b6d4" strokeWidth="1.1" />
            <line x1="126" y1="76" x2="135" y2="76" stroke="#38bdf8" strokeWidth="0.6" opacity="0.85" />
            <line x1="126" y1="82" x2="135" y2="82" stroke="#38bdf8" strokeWidth="0.6" opacity="0.85" />
            <line x1="126" y1="88" x2="135" y2="88" stroke="#38bdf8" strokeWidth="0.6" opacity="0.85" />
            <line x1="126" y1="94" x2="135" y2="94" stroke="#38bdf8" strokeWidth="0.6" opacity="0.85" />
            <line x1="126" y1="100" x2="135" y2="100" stroke="#38bdf8" strokeWidth="0.6" opacity="0.85" />

            {/* Building 3: Stepped Roof Corporate Center */}
            <polygon
              points="142,82 150,82 150,88 156,88 156,108 142,108"
              fill="url(#buildingGradSec)"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <line x1="145" y1="88" x2="148" y2="88" stroke="#38bdf8" strokeWidth="0.5" opacity="0.75" />
            <line x1="145" y1="94" x2="153" y2="94" stroke="#38bdf8" strokeWidth="0.5" opacity="0.75" />
            <line x1="145" y1="100" x2="153" y2="100" stroke="#38bdf8" strokeWidth="0.5" opacity="0.75" />

            {/* Building 4: Logistics & Utility Facility */}
            <rect x="160" y="96" width="9" height="12" fill="url(#buildingGradSec)" stroke="currentColor" strokeWidth="0.7" rx="0.5" />
            <line x1="162" y1="100" x2="166" y2="100" stroke="#38bdf8" strokeWidth="0.5" opacity="0.7" />

            {/* Building 5: Transit Interchange Station */}
            <rect x="94" y="106" width="14" height="10" fill="url(#buildingGradMain)" stroke="currentColor" strokeWidth="0.7" rx="0.5" />
          </g>

          {/* 5. CONNECTED INFRASTRUCTURE TELEMETRY NODES */}
          {networkNodes.map((node) => (
            <g key={node.id}>
              {/* Outer soft glow ring */}
              <circle
                cx={node.cx}
                cy={node.cy}
                r={node.r * 2.2}
                className="fill-cyan-400/20 dark:fill-cyan-400/25 animate-pulse"
                style={{ animationDuration: '2.6s' }}
              />
              {/* Core solid node */}
              <circle
                cx={node.cx}
                cy={node.cy}
                r={node.r}
                className="fill-cyan-600 dark:fill-cyan-300 stroke-white dark:stroke-slate-900"
                strokeWidth="0.6"
              />
            </g>
          ))}
        </svg>

        {/* ── FRONT LAYER: Expanding Radar Pulses & Continuous Sweep ── */}

        {/* Expanding Subtle Radar Pulse Waves */}
        <div
          className="absolute w-28 h-28 rounded-full border border-cyan-400/40 dark:border-cyan-400/50 animate-radar-pulse pointer-events-none"
          style={{ animationDuration: '3.2s' }}
        />
        <div
          className="absolute w-28 h-28 rounded-full border border-blue-400/30 dark:border-blue-400/40 animate-radar-pulse pointer-events-none"
          style={{ animationDuration: '3.2s', animationDelay: '1.6s' }}
        />

        {/* Continuous Rotating Translucent Radar Sweep Cone */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none transition-[animation-duration] duration-700 ease-out animate-radar-sweep"
          style={{
            background: 'conic-gradient(from 0deg at 50% 50%, rgba(6, 182, 212, 0.24) 0deg, rgba(6, 182, 212, 0.07) 45deg, rgba(59, 130, 246, 0.0) 90deg, transparent 360deg)',
            animationDuration: isHovered ? '5.6s' : '8.0s',
          }}
        >
          {/* Leading Beam Highlight Line */}
          <div className="absolute top-1/2 left-1/2 w-1/2 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-cyan-200 dark:via-cyan-300 dark:to-white shadow-[0_0_8px_rgba(6,182,212,0.9)] origin-left -translate-y-1/2" />
        </div>

        {/* Refined Central Analysis Node Hub */}
        <div className="relative z-10 flex items-center justify-center pointer-events-none">
          <div className="w-5 h-5 rounded-full bg-cyan-400/20 dark:bg-cyan-400/30 animate-ping absolute" />
          <div className="w-3.5 h-3.5 rounded-full bg-slate-900/60 dark:bg-slate-950/80 border border-cyan-400/60 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-300 shadow-[0_0_6px_rgba(6,182,212,1)]" />
          </div>
        </div>

        {/* Outer Circular Bezel */}
        <div className="absolute inset-0 rounded-full border border-slate-300/70 dark:border-cyan-500/35 pointer-events-none" />
      </div>

      {/* Subtle Data Freshness Badge — EXACT TEXT: LATEST DATA */}
      <div className="hidden lg:flex items-center gap-1.5 absolute -bottom-2.5 bg-slate-900/90 dark:bg-slate-950/95 text-cyan-300 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border border-cyan-500/35 backdrop-blur-xs shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <span>LATEST DATA</span>
      </div>
    </div>
  );
}

export default memo(HeroRadar);
