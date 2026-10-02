import { memo } from 'react';
import infrastructureBaseImg from '../../assets/infrastructure_base.png';

/**
 * RiskInfrastructureRadar — Final Infrastructure Intelligence Radar
 * 
 * Built around the immutable approved circular infrastructure base artwork.
 * Layers an analytical radar interface (concentric rings, radial grid, data topology,
 * telemetry nodes, scanning sweep, central intelligence hub, and LATEST DATA badge)
 * around the infrastructure environment.
 */
function RiskInfrastructureRadar({ className = '' }) {
  // 7 analytical telemetry nodes positioned around key infrastructure features in SVG coordinate space (200x200)
  const dataNodes = [
    { id: 'cbd-tower', cx: 78, cy: 68, r: 2.5, label: 'Urban CBD Complex' },
    { id: 'highway-flyover', cx: 34, cy: 75, r: 2.2, label: 'West Expressway Viaduct' },
    { id: 'central-junction', cx: 104, cy: 110, r: 2.8, label: 'Multi-Modal Interchange' },
    { id: 'rail-transit', cx: 142, cy: 96, r: 2.4, label: 'High-Speed Rail Corridor' },
    { id: 'hydro-facility', cx: 118, cy: 142, r: 2.4, label: 'Water & Dam Infrastructure' },
    { id: 'east-arterial', cx: 154, cy: 136, r: 2.2, label: 'East Arterial Highway' },
    { id: 'grid-terminal', cx: 172, cy: 102, r: 2.0, label: 'Power Transmission Node' },
  ];

  // 5 network topology lines connecting key infrastructure nodes
  const connectionLines = [
    { from: { x: 34, y: 75 }, to: { x: 104, y: 110 } },
    { from: { x: 78, y: 68 }, to: { x: 104, y: 110 } },
    { from: { x: 104, y: 110 }, to: { x: 142, y: 96 } },
    { from: { x: 104, y: 110 }, to: { x: 118, y: 142 } },
    { from: { x: 142, y: 96 }, to: { x: 172, y: 102 } },
    { from: { x: 118, y: 142 }, to: { x: 154, y: 136 } },
  ];

  return (
    <div
      aria-hidden="true"
      className={`relative select-none pointer-events-none flex flex-col items-center justify-center ${className}`}
    >
      {/* Outer Circular Viewport Container */}
      <div className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-92 lg:h-92 xl:w-[380px] xl:h-[380px] rounded-full flex items-center justify-center overflow-hidden pointer-events-none">
        {/* Soft Ambient Radial Backing */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent dark:from-cyan-950/40 dark:via-blue-950/30 dark:to-transparent pointer-events-none" />

        {/* ── LAYER 1: IMMUTABLE APPROVED INFRASTRUCTURE BASE ARTWORK ── */}
        <img
          src={infrastructureBaseImg}
          alt=""
          className="absolute inset-0 w-full h-full object-contain rounded-full select-none pointer-events-none opacity-95 dark:opacity-85"
        />

        {/* ── LAYER 2-5: ANALYTICAL SVG RADAR INTELLIGENCE OVERLAYS ── */}
        <svg
          className="absolute inset-0 w-full h-full text-cyan-500 dark:text-cyan-400 pointer-events-none"
          viewBox="0 0 200 200"
          fill="none"
        >
          {/* LAYER 2: Radial Data Grid (8 subtle polar guide divisions) */}
          <g opacity="0.25">
            <line x1="100" y1="12" x2="100" y2="188" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="12" y1="100" x2="188" y2="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="38" y1="38" x2="162" y2="162" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 4" opacity="0.5" />
            <line x1="162" y1="38" x2="38" y2="162" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 4" opacity="0.5" />
          </g>

          {/* LAYER 3: 3 Subtle Concentric Radar Rings */}
          <g opacity="0.45">
            {/* Inner Ring */}
            <circle cx="100" cy="100" r="34" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
            {/* Middle Dashed Ring */}
            <circle cx="100" cy="100" r="66" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.6" />
            {/* Outer Ring */}
            <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1.0" opacity="0.7" />
          </g>

          {/* LAYER 4: Sparse Data Topology Lines */}
          <g opacity="0.55">
            {connectionLines.map((line, idx) => (
              <line
                key={idx}
                x1={line.from.x}
                y1={line.from.y}
                x2={line.to.x}
                y2={line.to.y}
                stroke="#00c7e8"
                strokeWidth="0.7"
                strokeDasharray="2.5 3.5"
                className="opacity-60 dark:opacity-75"
              />
            ))}
          </g>

          {/* LAYER 5: Infrastructure Analytical Data Nodes (TOP layer markers) */}
          {dataNodes.map((node) => (
            <g key={node.id}>
              {/* Outer soft pulse halo */}
              <circle
                cx={node.cx}
                cy={node.cy}
                r={node.r * 2.2}
                className="fill-cyan-400/20 dark:fill-cyan-400/25 animate-pulse"
                style={{ animationDuration: '3.0s' }}
              />
              {/* Ring border */}
              <circle
                cx={node.cx}
                cy={node.cy}
                r={node.r * 1.4}
                stroke="#00c7e8"
                strokeWidth="0.6"
                className="opacity-75"
              />
              {/* Solid cyan node core */}
              <circle
                cx={node.cx}
                cy={node.cy}
                r={node.r}
                fill="#00c7e8"
                className="drop-shadow-[0_0_4px_rgba(0,199,232,0.85)]"
              />
            </g>
          ))}
        </svg>

        {/* ── LAYER 6: TRANSLUCENT RADAR SWEEP (Autonomous Slow & Continuous Sweep) ── */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none animate-radar-sweep"
          style={{
            background: 'conic-gradient(from 0deg at 50% 50%, rgba(0, 199, 232, 0.20) 0deg, rgba(37, 99, 235, 0.06) 50deg, rgba(37, 99, 235, 0.0) 90deg, transparent 360deg)',
            animationDuration: '9.5s',
          }}
        >
          {/* Subtle Soft Leading Beam Line */}
          <div className="absolute top-1/2 left-1/2 w-1/2 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-cyan-200 dark:via-cyan-300 dark:to-white shadow-[0_0_8px_rgba(0,199,232,0.85)] origin-left -translate-y-1/2" />
        </div>

        {/* ── LAYER 7: CENTRAL INTELLIGENCE NODE (Analytical Origin Hub) ── */}
        <div className="relative z-10 flex items-center justify-center pointer-events-none">
          {/* Outer Cyan Glow Halo */}
          <div className="w-5 h-5 rounded-full bg-cyan-400/20 dark:bg-cyan-400/30 animate-ping absolute" />
          {/* Thin Outer Ring */}
          <div className="w-4 h-4 rounded-full border border-cyan-400/75 dark:border-cyan-300 flex items-center justify-center shadow-[0_0_6px_rgba(0,199,232,0.5)]">
            {/* Inner Dark Blue Circle */}
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-[#071226] flex items-center justify-center border border-cyan-500/40">
              {/* Bright Cyan Center */}
              <div className="w-1.5 h-1.5 rounded-full bg-[#00c7e8] shadow-[0_0_5px_#00c7e8]" />
            </div>
          </div>
        </div>

        {/* Outer Circular Soft Rim */}
        <div className="absolute inset-0 rounded-full border border-slate-300/40 dark:border-cyan-500/25 pointer-events-none" />
      </div>

      {/* ── LAYER 8: LATEST DATA BADGE ── */}
      <div className="hidden lg:flex items-center gap-1.5 absolute -bottom-2.5 bg-slate-900/90 dark:bg-[#071226]/95 text-cyan-300 px-3.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border border-cyan-500/35 backdrop-blur-xs shadow-xs pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00c7e8] animate-pulse" />
        <span>LATEST DATA</span>
      </div>
    </div>
  );
}

export default memo(RiskInfrastructureRadar);
