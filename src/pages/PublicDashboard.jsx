import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Download, RefreshCw, BarChart2, PieChart as PieIcon, MapPin, Building2, TrendingUp, IndianRupee, Layers, ArrowRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { fetchAnalyticsOverview, fetchDashboardMetrics, fetchMLProjects } from '../services/mlApi';
import SectionCard from '../components/shared/SectionCard';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import IndiaInteractiveMap from '../components/shared/IndiaInteractiveMap';
import KPICard from '../components/shared/KPICard';
import CountUpNumber from '../components/shared/CountUpNumber';
import RiskInfrastructureRadar from '../components/shared/RiskInfrastructureRadar';
import HighValueProjectsSection from '../components/shared/HighValueProjectsSection';

// Intelligent, cross-browser word-wrapping for sector labels in the chart YAxis
function formatSectorLabel(label, maxCharsPerLine = 16) {
  if (!label) return [''];
  const words = label.trim().split(/\s+/);
  if (words.length === 1 || label.length <= maxCharsPerLine) {
    return [label];
  }

  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  // If more than 2 lines, cleanly combine into 2 lines
  if (lines.length > 2) {
    return [lines[0], lines.slice(1).join(' ')];
  }
  return lines;
}

function CustomSectorTick({ x, y, payload, axisColor, isMobile }) {
  const maxChars = isMobile ? 13 : 17;
  const lines = formatSectorLabel(payload?.value || '', maxChars);
  const isMultiLine = lines.length > 1;
  const fontSize = isMobile ? 9.5 : 10.5;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-10}
        y={0}
        textAnchor="end"
        dominantBaseline="central"
        fill={axisColor}
        fontSize={fontSize}
        fontWeight={500}
        style={{ userSelect: 'none' }}
      >
        {isMultiLine ? (
          <>
            <tspan x={-10} y={-7} dominantBaseline="central">
              {lines[0]}
            </tspan>
            <tspan x={-10} y={7} dominantBaseline="central">
              {lines[1]}
            </tspan>
          </>
        ) : (
          <tspan x={-10} y={0} dominantBaseline="central">
            {lines[0]}
          </tspan>
        )}
      </text>
    </g>
  );
}

export default function PublicDashboard() {
  const { theme } = useTheme();
  const location = useLocation();
  const [analytics, setAnalytics] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [sampleProjects, setSampleProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    Promise.all([
      fetchAnalyticsOverview().catch(e => { console.error(e); return null; }),
      fetchDashboardMetrics().catch(e => { console.error(e); return null; }),
      fetchMLProjects({ pageSize: 10 }).catch(e => { console.error(e); return { items: [] }; }),
    ]).then(([an, met, projs]) => {
      setAnalytics(an);
      setMetrics(met);
      setSampleProjects(projs?.items || projs?.projects || []);
      setLoading(false);
    });
  }, []);

  // Restore scroll position when navigating back from project detail
  useEffect(() => {
    if (location.state?.restoreScrollY !== undefined || location.state?.restoreSection === 'high-value') {
      const mainEl = document.getElementById('main-content');
      if (!mainEl) return;

      const performScroll = () => {
        if (location.state?.restoreScrollY !== undefined && location.state.restoreScrollY > 0) {
          mainEl.scrollTo({ top: location.state.restoreScrollY, behavior: 'instant' });
        } else {
          const sec = document.getElementById('high-value-projects-section');
          if (sec) {
            sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      };

      performScroll();
      const timer1 = setTimeout(performScroll, 60);
      const timer2 = setTimeout(performScroll, 250);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [location.state]);


  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const tooltipStyle = theme === 'dark'
    ? { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }
    : { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' };

  const sectorData = analytics?.sector_distribution?.slice(0, 6) || [];
  const chartHeight = Math.max(380, sectorData.length * 64);

  return (
    <div className="min-h-full bg-transparent">
      {/* Header / Hero Section with Autonomous Ambient Infrastructure Radar */}
      <header
        className="px-6 py-6 sm:py-7 border-b border-slate-200/60 dark:border-slate-800/80 glass-surface animate-fade-in relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 max-w-7xl mx-auto relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Risk<span className="text-blue-600 dark:text-cyan-400">Nexus</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
                PUBLIC PORTAL
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-50/80 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/60 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                LATEST DATA
              </span>
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              National Infrastructure Risk Early-Warning &amp; Cost Intelligence Platform
            </p>
            <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              RiskNexus is a national infrastructure risk early-warning platform designed to provide a unified view of major government projects. It brings together project cost, schedule, physical progress and risk indicators to help identify potential overruns and delays. AI-assisted analysis transforms project data into clear, actionable intelligence for decision-makers. The platform provides a transparent view of infrastructure progress using the latest available portfolio data.
            </p>
          </div>

          {/* Embedded Autonomous Ambient Infrastructure Radar (Non-interactive) */}
          <div className="shrink-0 flex items-center justify-center pointer-events-none">
            <RiskInfrastructureRadar />
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Public KPIs */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner label="Loading portfolio intelligence — please wait…" sublabel="Aggregating nationwide central sector project metrics" />
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              title="Monitored Projects"
              rawTarget={metrics.total_projects ?? 13497}
              formatter={(v) => Math.round(v).toLocaleString('en-IN')}
              value={metrics.total_projects?.toLocaleString() || '13,497'}
              type="projects"
              subtitle={
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  July 2026 Active Portfolio
                </span>
              }
              className="animate-slide-up stagger-1"
            />
            <KPICard
              title="Sanctioned Cost"
              rawTarget={(metrics.total_budget || 0) / 1000}
              formatter={(v) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K Cr`}
              value={`₹${((metrics.total_budget || 0) / 1000).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K Cr`}
              type="cost"
              subtitle="Original approved budget"
              className="animate-slide-up stagger-2"
            />
            <KPICard
              title="Cumulative Spend"
              rawTarget={(metrics.total_expenditure || 0) / 1000}
              formatter={(v) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K Cr`}
              value={`₹${((metrics.total_expenditure || 0) / 1000).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K Cr`}
              type="spend"
              subtitle="Disbursed to date"
              className="animate-slide-up stagger-3"
            />
            <KPICard
              title="Active Sectors"
              rawTarget={metrics.sectors_count ?? 25}
              formatter={(v) => Math.round(v).toString()}
              value={metrics.sectors_count || 25}
              type="sectors"
              subtitle={<span className="text-purple-600 dark:text-purple-400 font-semibold">Across 36 States &amp; UTs</span>}
              className="animate-slide-up stagger-4"
            />
          </div>
        ) : null}

        {/* Charts Row */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sector-wise Budget Distribution (Cross-Browser Protected Horizontal Bar) */}
            <SectionCard
              title="Sector-wise Budget Distribution"
              subtitle="Original budget vs. cumulative expenditure by major sector (Rs. Cr)"
            >
              <div style={{ height: `${chartHeight}px` }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={sectorData}
                    margin={{ top: 16, right: isMobile ? 16 : 28, left: 8, bottom: 8 }}
                    barCategoryGap="22%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis
                      type="number"
                      stroke={axisColor}
                      fontSize={isMobile ? 9 : 10}
                      tickFormatter={(val) => `₹${(val / 1000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}K Cr`}
                    />
                    <YAxis
                      type="category"
                      dataKey="sector"
                      stroke={axisColor}
                      width={isMobile ? 125 : 155}
                      interval={0}
                      tick={<CustomSectorTick axisColor={axisColor} isMobile={isMobile} />}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(label) => label}
                      formatter={(value, name) => [
                        `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`,
                        name,
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: isMobile ? '10px' : '11px', paddingTop: '8px' }} />
                    <Bar
                      dataKey="original_cost"
                      fill="#3b82f6"
                      name="Original Budget"
                      radius={[0, 4, 4, 0]}
                      barSize={11}
                      isAnimationActive={true}
                      animationDuration={1300}
                      animationEasing="ease-out"
                    />
                    <Bar
                      dataKey="expenditure"
                      fill="#10b981"
                      name="Expenditure"
                      radius={[0, 4, 4, 0]}
                      barSize={11}
                      isAnimationActive={true}
                      animationDuration={1300}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            {/* Physical Progress Breakdown */}
            <SectionCard title="Physical Progress Breakdown" subtitle="Portfolio distribution across execution stages">
              <div className="h-80 w-full flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.progress_distribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={1300}
                      animationEasing="ease-out"
                    >
                      {(analytics.progress_distribution || []).map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-1/2 space-y-2.5 pl-4 text-xs">
                  {(analytics.progress_distribution || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.value?.toLocaleString() || '—'}
                      </span>
                      <span className="text-slate-500">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Geographical Project Presence — Interactive India Map */}
        {analytics?.state_distribution && (
          <SectionCard
            title="Geographical Project Presence"
            subtitle="Project concentration across states & UTs"
          >
            <IndiaInteractiveMap stateDistribution={analytics.state_distribution} />
          </SectionCard>
        )}

        {/* High-Value Projects Section (Top 20 by Sanctioned Cost) */}
        <HighValueProjectsSection />
      </div>
    </div>
  );
}
