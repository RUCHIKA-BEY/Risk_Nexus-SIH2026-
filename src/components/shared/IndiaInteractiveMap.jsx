import { useState, useMemo } from 'react';
import { MapPin, TrendingUp, Layers, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import INDIA_PROJECTED_STATES from '../../assets/india_projected_paths.json';

// Helper to normalize state strings for robust cross-dataset matching
function normalizeName(str) {
  if (!str) return '';
  const clean = str.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (clean.includes('jammu') || clean.includes('kashmir')) return 'jammukashmir';
  if (clean.includes('andaman')) return 'andamannicobar';
  if (clean.includes('dadra') || clean.includes('daman') || clean.includes('diu')) return 'dadranagarhavelidamandiu';
  if (clean === 'orissa') return 'odisha';
  if (clean === 'pondicherry') return 'puducherry';
  if (clean === 'uttaranchal') return 'uttarakhand';
  return clean;
}

export default function IndiaInteractiveMap({ stateDistribution = [] }) {
  const { theme } = useTheme();
  const [hoveredState, setHoveredState] = useState(null);
  const [selectedState, setSelectedState] = useState(null);

  // Map backend dataset by normalized state key
  const stateDataMap = useMemo(() => {
    const map = new Map();
    stateDistribution.forEach(item => {
      const key = normalizeName(item.state);
      map.set(key, {
        rawState: item.state,
        project_count: item.project_count || 0,
        original_cost: item.original_cost || 0,
        high_risk_count: item.high_risk_count || 0,
      });
    });
    return map;
  }, [stateDistribution]);

  // Determine max projects for dynamic color scaling
  const maxProjects = useMemo(() => {
    let max = 1;
    stateDistribution.forEach(item => {
      if (item.project_count > max) max = item.project_count;
    });
    return max;
  }, [stateDistribution]);

  // Color calculation for geographic features
  const getFillColor = (count, isSelected, isHovered) => {
    if (isSelected) return '#f59e0b'; // Amber Gold for active selected state
    if (isHovered) return '#38bdf8'; // Sky Blue glow on hover
    if (!count || count === 0) {
      return theme === 'dark' ? '#1e293b' : '#e2e8f0';
    }

    const ratio = count / maxProjects;
    if (theme === 'dark') {
      if (ratio >= 0.7) return '#1e40af'; // High (>500)
      if (ratio >= 0.4) return '#2563eb'; // Medium (300-500)
      if (ratio >= 0.15) return '#3b82f6'; // Moderate (100-300)
      return '#1e3a8a';
    } else {
      if (ratio >= 0.7) return '#1e3a8a'; // High (>500)
      if (ratio >= 0.4) return '#2563eb'; // Medium (300-500)
      if (ratio >= 0.15) return '#60a5fa'; // Moderate (100-300)
      return '#93c5fd';
    }
  };

  // Active state data resolver (selected -> hovered -> default top state)
  const activeStateInfo = useMemo(() => {
    const targetState = selectedState || hoveredState;
    if (targetState) {
      const data = stateDataMap.get(normalizeName(targetState.name));
      return {
        name: targetState.name,
        count: data?.project_count || 0,
        cost: data?.original_cost || 0,
        highRisk: data?.high_risk_count || 0,
        hasData: !!data,
      };
    }
    // Default to Maharashtra (top state)
    const top = stateDistribution[0];
    return {
      name: top?.state || 'Maharashtra',
      count: top?.project_count || 732,
      cost: top?.original_cost || 1223910.47,
      highRisk: top?.high_risk_count || 0,
      hasData: true,
    };
  }, [selectedState, hoveredState, stateDataMap, stateDistribution]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
      {/* Real Geographic India Map */}
      <div className="w-full lg:w-3/5 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 relative">
        <div className="flex items-center justify-between mb-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Layers size={14} className="text-blue-500" />
            <span>Geographic State Distribution Map</span>
          </div>
          <span className="text-[11px] text-slate-400">Click a state to inspect data</span>
        </div>

        {/* SVG Viewport */}
        <div className="relative w-full aspect-[600/650] max-h-[480px] flex items-center justify-center">
          <svg
            viewBox="0 0 600 650"
            className="w-full h-full drop-shadow-sm select-none"
          >
            {INDIA_PROJECTED_STATES.map((state) => {
              const stateData = stateDataMap.get(normalizeName(state.name));
              const count = stateData?.project_count || 0;
              const isSelected = selectedState?.name === state.name;
              const isHovered = hoveredState?.name === state.name;

              return (
                <path
                  key={state.id}
                  d={state.path}
                  fill={getFillColor(count, isSelected, isHovered)}
                  stroke={isSelected ? '#b45309' : isHovered ? '#0284c7' : theme === 'dark' ? '#334155' : '#ffffff'}
                  strokeWidth={isSelected ? '2.5' : isHovered ? '1.8' : '0.8'}
                  className="cursor-pointer transition-colors duration-150 ease-out"
                  onMouseEnter={() => setHoveredState(state)}
                  onMouseLeave={() => setHoveredState(null)}
                  onClick={() => setSelectedState(state)}
                >
                  <title>{`${state.name}: ${count} projects monitored`}</title>
                </path>
              );
            })}
          </svg>

          {/* Floating Hover Tooltip */}
          {hoveredState && (
            <div className="absolute top-2 left-2 z-20 pointer-events-none bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xs text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-slate-700 space-y-0.5">
              <p className="font-bold text-blue-300">{hoveredState.name}</p>
              <p className="text-[11px] text-slate-200">
                <span className="font-semibold text-white">
                  {(stateDataMap.get(normalizeName(hoveredState.name))?.project_count || 0).toLocaleString()}
                </span>{' '}
                projects monitored
              </p>
            </div>
          )}
        </div>

        {/* Density Legend */}
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-medium">Project Concentration:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-blue-200 dark:bg-blue-950 inline-block" />
              <span>&lt;100</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-blue-400 dark:bg-blue-700 inline-block" />
              <span>100–300</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
              <span>300–500</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-blue-800 dark:bg-blue-500 inline-block" />
              <span>500+</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
            <span className="font-medium">Selected</span>
          </div>
        </div>
      </div>

      {/* State Detail & Top States Panel */}
      <div className="w-full lg:w-2/5 space-y-4">
        {/* Selected State Focused Card */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 shrink-0">
                <MapPin size={18} />
              </div>
              <div className="truncate">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  {selectedState ? 'Selected State / UT' : 'Highlighted State'}
                </p>
                <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {activeStateInfo.name}
                </h4>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shrink-0">
              {activeStateInfo.count.toLocaleString()} projects
            </span>
          </div>

          <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">Total Sanctioned</p>
            <p className="text-base font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
              Rs. {(activeStateInfo.cost / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}K Cr
            </p>
          </div>

          {activeStateInfo.hasData && (
            <div className="mt-3 pt-1 flex justify-end">
              <Link
                to={`/projects/all?state=${encodeURIComponent(activeStateInfo.name)}`}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                View State Projects <ExternalLink size={12} />
              </Link>
            </div>
          )}
        </div>

        {/* Top 6 Monitored States Quick Selector */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-blue-600" />
            Top Monitored States
          </h4>
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {stateDistribution.slice(0, 8).map((st) => {
              const isSelected = normalizeName(activeStateInfo.name) === normalizeName(st.state);
              return (
                <button
                  key={st.state}
                  type="button"
                  onClick={() => {
                    const match = INDIA_PROJECTED_STATES.find(p => normalizeName(p.name) === normalizeName(st.state));
                    if (match) setSelectedState(match);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 font-semibold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  <span className="text-slate-800 dark:text-slate-200 truncate pr-2">
                    {st.state}
                  </span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
                    {st.project_count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
