/**
 * FCMNetworkGraph — Interactive SVG visualisation of the FCM propagation network.
 *
 * Renders all 9 authentic FCM concepts (6 input, 2 intermediate, 1 output) and
 * the 16 expert-weighted directed edges from backend/app/fcm/fcm_weights.json.
 *
 * NO fake relationships are created. Every node and edge displayed here exists
 * in the real FCM engine used by /simulate/fcm.
 */
import { useState, useMemo, useRef } from 'react';
import { FCM_NODES, FCM_EDGES, CATEGORIES } from './fcmConstants';

// ── Layout positions for 3-column FCM graph ─────────────────────────────────────
// Col 1: Inputs (left)     Col 2: Intermediates (center)    Col 3: Output (right)

const LAYOUT = {
  width: 760,
  height: 420,
  nodeRadius: 28,
  positions: {
    // Physical Progress
    physical_progress_gap:      { x: 100, y: 70 },
    // Schedule
    reported_delay_pressure:    { x: 100, y: 170 },
    schedule_revision_pressure: { x: 100, y: 270 },
    // Financial
    expenditure_progress_gap:   { x: 100, y: 370 },
    cost_revision_pressure:     { x: 100, y: 470 },
    forecast_cost_pressure:     { x: 100, y: 570 },
    // Intermediate
    schedule_pressure:          { x: 420, y: 170 },
    cost_pressure:              { x: 420, y: 430 },
    // Output
    intervention_priority:      { x: 680, y: 300 },
  },
};

// Dynamic height: enough for all 6 inputs + padding
const SVG_HEIGHT = 630;

const ROLE_COLORS = {
  input:        { fill: '#1e293b', stroke: '#475569', text: '#e2e8f0', glow: 'rgba(100, 116, 139, 0.3)' },
  intermediate: { fill: '#1e1b4b', stroke: '#6366f1', text: '#c7d2fe', glow: 'rgba(99, 102, 241, 0.35)' },
  output:       { fill: '#4c1d95', stroke: '#8b5cf6', text: '#ddd6fe', glow: 'rgba(139, 92, 246, 0.4)' },
};


function getEdgeColor(weight) {
  if (weight >= 0.8)  return '#ef4444'; // strong positive
  if (weight >= 0.6)  return '#f97316'; // moderate positive
  if (weight >= 0.3)  return '#eab308'; // mild positive
  if (weight > 0)     return '#84cc16'; // weak positive
  if (weight <= -0.5) return '#06b6d4'; // strong negative
  return '#94a3b8';                     // near zero
}

function getEdgeOpacity(weight) {
  return Math.max(0.35, Math.min(1.0, Math.abs(weight)));
}

// Compute a cubic Bézier curve from source to target with curvature
function computePath(sx, sy, tx, ty, curveIndex = 0) {
  const dx = tx - sx;
  const dy = ty - sy;
  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;
  // Add perpendicular offset for multiple edges between same pair
  const offset = curveIndex * 15;
  const perpX = -dy * 0.15 + offset * (dx === 0 ? 1 : dx / Math.abs(dx || 1)) * 0.3;
  const perpY = dx * 0.15 + offset * 0.3;
  const cx1 = midX + perpX;
  const cy1 = midY + perpY;
  return `M ${sx} ${sy} Q ${cx1} ${cy1} ${tx} ${ty}`;
}

export default function FCMNetworkGraph({ baseline, scenario, changes, isSimulated }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const svgRef = useRef(null);

  // Use authentic edges from constants (always available), or from API when simulated
  const edges = useMemo(() => {
    return FCM_EDGES;
  }, []);

  const positions = LAYOUT.positions;
  const nodeKeys = Object.keys(positions);

  // Determine which edges connect to the hovered node
  const connectedEdges = useMemo(() => {
    if (!hoveredNode) return new Set();
    const set = new Set();
    edges.forEach((e, i) => {
      if (e.source === hoveredNode || e.target === hoveredNode) set.add(i);
    });
    return set;
  }, [hoveredNode, edges]);

  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set();
    const set = new Set([hoveredNode]);
    edges.forEach((e) => {
      if (e.source === hoveredNode) set.add(e.target);
      if (e.target === hoveredNode) set.add(e.source);
    });
    return set;
  }, [hoveredNode, edges]);

  // Track edge pairs for curve offset
  const edgePairIndex = useMemo(() => {
    const map = {};
    edges.forEach((e, i) => {
      const pairKey = [e.source, e.target].sort().join('::');
      if (!map[pairKey]) map[pairKey] = [];
      map[pairKey].push(i);
    });
    const result = {};
    Object.values(map).forEach((indices) => {
      indices.forEach((idx, order) => {
        result[idx] = order;
      });
    });
    return result;
  }, [edges]);

  const getNodeValue = (key) => {
    if (isSimulated && scenario) return scenario[key] ?? 0.5;
    if (baseline) return baseline[key] ?? 0.5;
    return 0.5;
  };

  const getNodeChange = (key) => {
    if (!isSimulated || !changes) return 0;
    return changes[key] ?? 0;
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${LAYOUT.width} ${SVG_HEIGHT}`}
        className="w-full h-auto"
        style={{ minHeight: '320px', maxHeight: '520px' }}
      >
        <defs>
          {/* Arrow marker */}
          <marker
            id="fcm-arrow"
            viewBox="0 0 10 6"
            refX="10"
            refY="3"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 3 L 0 6 Z" fill="#94a3b8" />
          </marker>
          {/* Colored arrow markers for each weight range */}
          {['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#94a3b8'].map((color) => (
            <marker
              key={color}
              id={`fcm-arrow-${color.slice(1)}`}
              viewBox="0 0 10 6"
              refX="10"
              refY="3"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 3 L 0 6 Z" fill={color} />
            </marker>
          ))}
          {/* Glow filter */}
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Pulse animation for active propagation */}
          <filter id="edge-pulse">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Background category regions ─────────────── */}
        {CATEGORIES.map((cat) => {
          const catNodes = cat.nodes.map((k) => positions[k]).filter(Boolean);
          if (catNodes.length === 0) return null;
          const minY = Math.min(...catNodes.map((n) => n.y)) - 40;
          const maxY = Math.max(...catNodes.map((n) => n.y)) + 40;
          return (
            <rect
              key={cat.id}
              x={20}
              y={minY}
              width={200}
              height={maxY - minY}
              rx={12}
              fill="none"
              stroke="currentColor"
              strokeDasharray="4 4"
              className="text-slate-300 dark:text-slate-700"
              opacity={0.5}
            />
          );
        })}

        {/* ── Edges ───────────────────────────────────── */}
        {edges.map((edge, idx) => {
          const sPos = positions[edge.source];
          const tPos = positions[edge.target];
          if (!sPos || !tPos) return null;

          const r = LAYOUT.nodeRadius;
          // Shorten line by node radius at each end
          const angle = Math.atan2(tPos.y - sPos.y, tPos.x - sPos.x);
          const sx = sPos.x + r * Math.cos(angle);
          const sy = sPos.y + r * Math.sin(angle);
          const tx = tPos.x - (r + 8) * Math.cos(angle);
          const ty = tPos.y - (r + 8) * Math.sin(angle);

          const color = getEdgeColor(edge.weight);
          const opacity = getEdgeOpacity(edge.weight);
          const dimmed = hoveredNode && !connectedEdges.has(idx);
          const highlighted = hoveredEdge === idx;
          const isActiveEdge = isSimulated && Math.abs(getNodeChange(edge.target)) > 0.001;

          const path = computePath(sx, sy, tx, ty, edgePairIndex[idx] || 0);
          const markerId = `fcm-arrow-${color.slice(1)}`;

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoveredEdge(idx)}
              onMouseLeave={() => setHoveredEdge(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Wider invisible hit area */}
              <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
              />
              {/* Visible edge */}
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={highlighted ? 2.5 : isActiveEdge ? 2 : 1.5}
                opacity={dimmed ? 0.12 : highlighted ? 1 : opacity * 0.7}
                markerEnd={`url(#${markerId})`}
                strokeLinecap="round"
                filter={isActiveEdge && !dimmed ? 'url(#edge-pulse)' : undefined}
                className="transition-all duration-300"
              />
              {/* Weight label on hover */}
              {highlighted && (
                <g>
                  <rect
                    x={(sx + tx) / 2 - 18}
                    y={(sy + ty) / 2 - 10}
                    width={36}
                    height={18}
                    rx={4}
                    fill="#1e293b"
                    opacity={0.9}
                  />
                  <text
                    x={(sx + tx) / 2}
                    y={(sy + ty) / 2 + 3}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize={10}
                    fontWeight={600}
                    fontFamily="Inter, sans-serif"
                  >
                    {edge.weight > 0 ? '+' : ''}{edge.weight.toFixed(2)}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* ── Nodes ───────────────────────────────────── */}
        {nodeKeys.map((key) => {
          const pos = positions[key];
          const node = FCM_NODES[key];
          if (!node || !pos) return null;

          const value = getNodeValue(key);
          const change = getNodeChange(key);
          const pct = (value * 100).toFixed(0);
          const roleColors = ROLE_COLORS[node.role];
          const dimmed = hoveredNode && !connectedNodes.has(key);
          const isHovered = hoveredNode === key;
          const r = LAYOUT.nodeRadius;

          return (
            <g
              key={key}
              onMouseEnter={() => setHoveredNode(key)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
              opacity={dimmed ? 0.25 : 1}
              className="transition-opacity duration-300"
            >
              {/* Glow ring */}
              {isHovered && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 6}
                  fill="none"
                  stroke={roleColors.stroke}
                  strokeWidth={2}
                  opacity={0.4}
                  filter="url(#node-glow)"
                />
              )}

              {/* Value ring (arc showing activation level) */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r + 2}
                fill="none"
                stroke={roleColors.stroke}
                strokeWidth={3}
                strokeDasharray={`${value * 2 * Math.PI * (r + 2)} ${2 * Math.PI * (r + 2)}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                opacity={0.7}
                transform={`rotate(-90, ${pos.x}, ${pos.y})`}
                className="transition-all duration-500"
              />

              {/* Node body */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={roleColors.fill}
                stroke={roleColors.stroke}
                strokeWidth={isHovered ? 2 : 1.5}
                className="transition-all duration-200"
              />

              {/* Label */}
              <text
                x={pos.x}
                y={pos.y - 5}
                textAnchor="middle"
                fill={roleColors.text}
                fontSize={8.5}
                fontWeight={600}
                fontFamily="Inter, sans-serif"
              >
                {node.shortLabel}
              </text>

              {/* Value */}
              <text
                x={pos.x}
                y={pos.y + 10}
                textAnchor="middle"
                fill={roleColors.text}
                fontSize={11}
                fontWeight={800}
                fontFamily="Inter, sans-serif"
                opacity={0.9}
              >
                {pct}%
              </text>

              {/* Change badge */}
              {isSimulated && Math.abs(change) > 0.005 && (
                <g>
                  <rect
                    x={pos.x + r - 8}
                    y={pos.y - r - 4}
                    width={28}
                    height={16}
                    rx={4}
                    fill={change > 0 ? '#be123c' : '#047857'}
                    opacity={0.9}
                  />
                  <text
                    x={pos.x + r + 6}
                    y={pos.y - r + 8}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={8}
                    fontWeight={700}
                    fontFamily="Inter, sans-serif"
                  >
                    {change > 0 ? '↑' : '↓'}{Math.abs(change * 100).toFixed(0)}%
                  </text>
                </g>
              )}

              {/* Tooltip on hover */}
              {isHovered && (
                <g>
                  <rect
                    x={pos.x - 80}
                    y={pos.y + r + 8}
                    width={160}
                    height={40}
                    rx={6}
                    fill="#0f172a"
                    opacity={0.95}
                    className="drop-shadow-lg"
                  />
                  <text
                    x={pos.x}
                    y={pos.y + r + 23}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize={9}
                    fontWeight={600}
                    fontFamily="Inter, sans-serif"
                  >
                    {node.label}
                  </text>
                  <text
                    x={pos.x}
                    y={pos.y + r + 38}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={8}
                    fontFamily="Inter, sans-serif"
                  >
                    {node.role === 'input' ? 'Input (clamped)' : node.role === 'intermediate' ? 'Intermediate' : 'Output'} · {pct}%
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* ── Column Labels ───────────────────────────── */}
        <text x={100} y={22} textAnchor="middle" fill="currentColor" fontSize={10} fontWeight={700} fontFamily="Inter, sans-serif" className="text-slate-400 dark:text-slate-500">
          INPUT PRESSURES
        </text>
        <text x={420} y={130} textAnchor="middle" fill="currentColor" fontSize={10} fontWeight={700} fontFamily="Inter, sans-serif" className="text-slate-400 dark:text-slate-500">
          RISK SYNTHESIS
        </text>
        <text x={680} y={250} textAnchor="middle" fill="currentColor" fontSize={10} fontWeight={700} fontFamily="Inter, sans-serif" className="text-slate-400 dark:text-slate-500">
          OUTCOME
        </text>
      </svg>
    </div>
  );
}
