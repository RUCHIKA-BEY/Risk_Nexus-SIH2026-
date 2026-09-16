import { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

const COLORS = [
  '#3b82f6', // blue-500
  '#16a34a', // green-600
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#0ea5e9', // sky-500
  '#d946ef', // fuchsia-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#ec4899', // pink-500
  '#84cc16', // lime-500
];

const DEFAULT_DATA = [
  { state: 'Maharashtra', count: 42, percentage: 18.3 },
  { state: 'Karnataka', count: 35, percentage: 15.2 },
  { state: 'Gujarat', count: 28, percentage: 12.2 },
  { state: 'Tamil Nadu', count: 25, percentage: 10.9 },
  { state: 'Uttar Pradesh', count: 22, percentage: 9.6 },
  { state: 'Rajasthan', count: 18, percentage: 7.8 },
  { state: 'Madhya Pradesh', count: 16, percentage: 7.0 },
  { state: 'West Bengal', count: 14, percentage: 6.1 },
  { state: 'Delhi', count: 12, percentage: 5.2 },
  { state: 'Others', count: 18, percentage: 7.7 },
];

/* ── tiny SVG export icons ── */
function CsvIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
      <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <text x="10" y="13" textAnchor="middle" fill="currentColor" fontSize="6" fontWeight="600" fontFamily="Inter, sans-serif">CSV</text>
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">
      <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <text x="10" y="13" textAnchor="middle" fill="currentColor" fontSize="5.5" fontWeight="600" fontFamily="Inter, sans-serif">XLS</text>
    </svg>
  );
}

/* ── custom label for significant donut segments ── */
function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) {
  if (percentage < 6) return null;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 16;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="fill-slate-600 dark:fill-slate-300"
      fontSize={11}
      fontWeight={500}
    >
      {percentage}%
    </text>
  );
}

/* ── custom tooltip ── */
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 shadow-lg text-xs text-slate-700 dark:text-slate-200">
      <span className="font-semibold">{d.state}</span>: {d.count} projects ({d.percentage}%)
    </div>
  );
}

/* ── CSV download helper ── */
function downloadCSV(data) {
  const header = 'State Name,Total Projects,% Share\n';
  const rows = data.map((d) => `"${d.state}",${d.count},${d.percentage}`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'state_distribution.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Excel (TSV) download helper ── */
function downloadExcel(data) {
  const header = 'State Name\tTotal Projects\t% Share\n';
  const rows = data.map((d) => `${d.state}\t${d.count}\t${d.percentage}`).join('\n');
  const blob = new Blob([header + rows], {
    type: 'application/vnd.ms-excel',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'state_distribution.xls';
  a.click();
  URL.revokeObjectURL(url);
}

export default function StateWiseDistribution({ data }) {
  const items = data?.length ? data : DEFAULT_DATA;
  const totalProjects = items.reduce((sum, d) => sum + d.count, 0);
  const [view, setView] = useState('charts');

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded h-full flex flex-col">
      {/* ── Card Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            State-wise Distribution
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {totalProjects} Projects
          </p>
        </div>

        {/* Segmented control */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded p-0.5">
          {['Charts', 'Data'].map((label) => {
            const key = label.toLowerCase();
            const active = view === key;
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  active
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Export row ── */}
      <div className="flex items-center gap-2 px-5 pt-3">
        <button onClick={() => downloadCSV(items)} title="Export CSV" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <CsvIcon />
        </button>
        <button onClick={() => downloadExcel(items)} title="Export Excel" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ExcelIcon />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="p-5 flex-1 flex flex-col">
        {view === 'charts' ? (
          /* ── Chart View ── */
          <div className="flex flex-col md:flex-row items-center gap-6 flex-1 justify-center w-full h-64">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <Pie
                  data={items}
                  dataKey="count"
                  nameKey="state"
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="70%"
                  paddingAngle={2}
                  label={renderLabel}
                  labelLine={false}
                >
                  {items.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="w-1/2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm pr-4">
              {items.map((d, i) => (
                <div key={d.state} className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-300 truncate" title={`${d.state} (${d.count})`}>
                    {d.state}
                    <span className="text-slate-400 dark:text-slate-500 ml-1">
                      ({d.count})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Data View ── */
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    State Name
                  </th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    Total Projects
                  </th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    % Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((d, i) => (
                  <tr
                    key={d.state}
                    className={`border-b border-slate-100 dark:border-slate-700/50 ${
                      i % 2 === 0
                        ? 'bg-white dark:bg-slate-800'
                        : 'bg-slate-50/50 dark:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-2 px-4 text-xs text-slate-700 dark:text-slate-200 font-medium">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        {d.state}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-xs text-slate-600 dark:text-slate-300 text-right tabular-nums">
                      {d.count}
                    </td>
                    <td className="py-2 px-4 text-xs text-slate-600 dark:text-slate-300 text-right tabular-nums">
                      {d.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-900/50 font-semibold">
                  <td className="py-2 px-4 text-xs text-slate-700 dark:text-slate-200">Total</td>
                  <td className="py-2 px-4 text-xs text-slate-700 dark:text-slate-200 text-right tabular-nums">
                    {totalProjects}
                  </td>
                  <td className="py-2 px-4 text-xs text-slate-700 dark:text-slate-200 text-right tabular-nums">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
