import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Send, Loader2 } from 'lucide-react';
import { askRex } from '../../services/mlApi';

/**
 * REX AI Floating Action Button + assistant drawer.
 *
 * Rendered at a fixed position in the viewport — never nested inside
 * a scrollable or overflow-hidden container.
 * Other components can open it with a question:
 *   window.dispatchEvent(new CustomEvent('rex:ask', { detail: { question, projectId, asOf } }))
 */

function RexMiniAvatar() {
  return (
    <div className="w-5 h-5 rounded-full p-[1.5px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
      <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center">
        <div className="flex items-center gap-[2px]">
          <div className="w-[3px] h-[3px] rounded-full bg-white flex items-center justify-center">
            <div className="w-[1.5px] h-[1.5px] rounded-full bg-slate-950" />
          </div>
          <div className="w-[3px] h-[3px] rounded-full bg-white flex items-center justify-center">
            <div className="w-[1.5px] h-[1.5px] rounded-full bg-slate-950" />
          </div>
        </div>
        <svg width="4" height="2" viewBox="0 0 4 2" fill="none" className="mt-[1px]">
          <path d="M0.5 0.5 Q 2 1.8 3.5 0.5" stroke="#0b1120" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

const RESERVED = new Set(['all', 'mine', 'milestones', 'map', 'compare']);
const PAGE_NAMES = [
  [/^\/$/, 'Dashboard'], [/^\/public/, 'Public Dashboard'], [/^\/projects\/all\/?$/, 'All Projects'],
  [/\/trajectory/, 'Risk Trajectory'], [/\/risk/, 'Risk Assessment'], [/^\/projects\/compare/, 'Comparison'],
  [/^\/projects\/map/, 'Map View'], [/^\/analytics/, 'Analytics'], [/^\/ai\/insights/, 'AI Insights'],
  [/^\/ai\/alerts/, 'Risk Alerts'], [/^\/actions/, 'Actions'], [/^\/reports/, 'Reports'], [/^\/settings/, 'Settings'],
];

function routeContext(location) {
  const m = location.pathname.match(/^\/projects\/(?:all\/)?([^/]+)/);
  const projectId = m && !RESERVED.has(m[1]) ? decodeURIComponent(m[1]) : null;
  const asOf = new URLSearchParams(location.search).get('as_of') || null;
  const page = (PAGE_NAMES.find(([re]) => re.test(location.pathname)) || [null, null])[1];
  return { projectId, asOf, page };
}

const STARTERS = [
  'What does the risk score actually mean?',
  'How should I read the SHAP drivers?',
  'Why is this project flagged?',
  'What is the what-if network and how do I use it?',
];

export default function RexAIFab() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  // Eye and pupil DOM refs for 60fps cursor tracking without React re-renders
  const leftEyeRef = useRef(null);
  const rightEyeRef = useRef(null);
  const leftPupilRef = useRef(null);
  const rightPupilRef = useRef(null);

  const ctx = routeContext(location);

  const triggerBlink = () => {
    setBlinking(true);
    setTimeout(() => setBlinking(false), 200);
  };

  const handleToggle = () => {
    triggerBlink();
    setOpen((o) => !o);
  };

  // 1. Real-time Cursor Tracking (requestAnimationFrame + DOM transforms)
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const hasFinePointer = window.matchMedia?.('(pointer: fine)')?.matches;

    // Skip tracking on touch devices or if reduced motion is requested
    if (prefersReducedMotion || (hasFinePointer !== undefined && !hasFinePointer)) {
      return;
    }

    let rafId = null;
    const MAX_PUPIL_DISTANCE = 3.2;

    const handleMouseMove = (event) => {
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        const eyePairs = [
          { eye: leftEyeRef.current, pupil: leftPupilRef.current },
          { eye: rightEyeRef.current, pupil: rightPupilRef.current },
        ];

        eyePairs.forEach(({ eye, pupil }) => {
          if (!eye || !pupil) return;
          const rect = eye.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const deltaX = event.clientX - centerX;
          const deltaY = event.clientY - centerY;
          const angle = Math.atan2(deltaY, deltaX);

          // Gracefully scale distance based on cursor proximity
          const rawDistance = Math.hypot(deltaX, deltaY);
          const distance = Math.min(MAX_PUPIL_DISTANCE, rawDistance * 0.045);

          const pupilX = Math.cos(angle) * distance;
          const pupilY = Math.sin(angle) * distance;

          pupil.style.transform = `translate3d(${pupilX.toFixed(2)}px, ${pupilY.toFixed(2)}px, 0)`;
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // 2. Natural Occasional Idle Blink (Randomized 4-8s interval)
  useEffect(() => {
    if (open) return;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion) return;

    let timeoutId;
    const scheduleNextBlink = () => {
      const delay = Math.random() * 4000 + 4000;
      timeoutId = setTimeout(() => {
        triggerBlink();
        scheduleNextBlink();
      }, delay);
    };

    scheduleNextBlink();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [open]);

  const send = async (question, override = {}) => {
    const q = (question || '').trim();
    if (!q || busy) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput('');
    setBusy(true);
    try {
      const res = await askRex({
        question: q,
        projectId: override.projectId || ctx.projectId,
        asOf: override.asOf || ctx.asOf,
        page: ctx.page,
        history,
      });
      setMessages((m) => [...m, { role: 'assistant', content: res.answer, source: res.source }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `REX could not reach the backend (${e.message}). Check that the API server is running.`, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onAsk = (e) => {
      setOpen(true);
      if (e.detail?.question) send(e.detail.question, e.detail);
    };
    window.addEventListener('rex:ask', onAsk);
    return () => window.removeEventListener('rex:ask', onAsk);
  });

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="REX AI assistant"
          className="fixed z-50 bottom-24 right-4 sm:right-6 w-[min(420px,calc(100vw-2rem))] h-[min(600px,calc(100vh-8rem))] flex flex-col rounded-2xl glass-dialog"
        >
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <RexMiniAvatar />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">REX AI Assistant</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {ctx.projectId ? `Project ${ctx.projectId}${ctx.asOf ? ` · as of ${ctx.asOf}` : ''}` : ctx.page || 'Risk Nexus'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close REX"
              className="ml-auto p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X size={16} />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Ask me what any term, score or chart means. On a project page I explain it using that project's own numbers.
                </p>
                <div className="flex flex-col gap-2">
                  {STARTERS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[88%] whitespace-pre-wrap text-xs leading-relaxed rounded-2xl px-3 py-2 ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : m.error
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200 rounded-bl-sm'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 rounded-bl-sm'
                }`}>
                  {m.content}
                  {m.source === 'rule_based' && (
                    <span className="block mt-1 text-[10px] opacity-60">Glossary answer · set GEMINI_API_KEY for full AI answers</span>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> REX is thinking…</div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 p-3 border-t border-slate-200 dark:border-slate-700"
          >
            <label htmlFor="rex-input" className="sr-only">Ask REX</label>
            <input
              id="rex-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a term, score or this project…"
              className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send"
              className="p-2 rounded-lg bg-blue-600 text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Floating REX AI Orb Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={open ? 'Close REX AI Assistant' : 'Open REX AI Assistant'}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-50 group focus:outline-none select-none cursor-pointer"
        style={{ isolation: 'isolate' }}
      >
        {/* Subtle, Thin Outer Energy Halo (Toned down and restrained) */}
        <span
          className={`absolute -inset-1.5 rounded-full border border-cyan-400/30 transition-all duration-300 pointer-events-none ${
            open
              ? 'opacity-100 scale-105 animate-rex-halo'
              : 'opacity-0 scale-95 group-hover:opacity-70 group-hover:scale-100'
          }`}
        />

        {/* Outer Ring & Subtle Cyan/Blue Glow Container */}
        <span
          className={`
            relative block rounded-full p-[2px]
            transition-all duration-300 ease-out
            group-hover:scale-[1.03]
            ${open
              ? 'shadow-[0_0_22px_rgba(6,182,212,0.5),0_0_10px_rgba(99,102,241,0.35)] scale-[1.02]'
              : 'shadow-[0_0_15px_rgba(6,182,212,0.3),0_0_8px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.45),0_0_10px_rgba(59,130,246,0.3)]'
            }
          `}
          style={{
            background: 'linear-gradient(135deg, #22d3ee 0%, #38bdf8 30%, #3b82f6 60%, #8b5cf6 100%)',
          }}
        >
          {/* Inner 3D Blue-to-Purple AI Sphere */}
          <span
            className="relative flex items-center justify-center rounded-full overflow-hidden transition-all duration-200"
            style={{
              width: 56,
              height: 56,
              background: 'radial-gradient(circle at 35% 28%, #38bdf8 0%, #2563eb 32%, #1e40af 62%, #6366f1 88%, #4338ca 100%)',
              boxShadow: 'inset 0 -3px 8px rgba(6, 182, 212, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.35)',
            }}
          >
            {/* Top-left Glossy Specular Light Highlight */}
            <span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 36% 22%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.08) 36%, transparent 65%)',
              }}
            />

            {/* ── Unified Internal FACE CONTAINER (Centered vertically & horizontally) ── */}
            <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none select-none">
              {/* Symmetrical Eyes Row */}
              <div
                className={`flex items-center justify-center gap-2 transition-transform ${
                  blinking ? 'animate-rex-blink' : ''
                }`}
                style={{ transformOrigin: 'center center' }}
              >
                {/* Left Eye */}
                <div
                  ref={leftEyeRef}
                  className="relative flex items-center justify-center w-[13.5px] h-[13.5px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35),0_0_1px_rgba(255,255,255,0.9)] overflow-hidden shrink-0"
                >
                  {/* Left Pupil */}
                  <div
                    ref={leftPupilRef}
                    className="relative w-[7px] h-[7px] rounded-full bg-slate-950 flex items-center justify-center shrink-0"
                    style={{
                      transform: 'translate3d(0, 0, 0)',
                      transition: 'transform 100ms cubic-bezier(0.22, 1, 0.36, 1)',
                      willChange: 'transform',
                    }}
                  >
                    {/* Catchlight Specular Highlight */}
                    <span className="absolute top-[1px] right-[1px] w-[2px] h-[2px] rounded-full bg-white pointer-events-none" />
                  </div>
                </div>

                {/* Right Eye */}
                <div
                  ref={rightEyeRef}
                  className="relative flex items-center justify-center w-[13.5px] h-[13.5px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35),0_0_1px_rgba(255,255,255,0.9)] overflow-hidden shrink-0"
                >
                  {/* Right Pupil */}
                  <div
                    ref={rightPupilRef}
                    className="relative w-[7px] h-[7px] rounded-full bg-slate-950 flex items-center justify-center shrink-0"
                    style={{
                      transform: 'translate3d(0, 0, 0)',
                      transition: 'transform 100ms cubic-bezier(0.22, 1, 0.36, 1)',
                      willChange: 'transform',
                    }}
                  >
                    {/* Catchlight Specular Highlight */}
                    <span className="absolute top-[1px] right-[1px] w-[2px] h-[2px] rounded-full bg-white pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Centered Friendly Mouth (Positioned directly under midpoint of eyes) */}
              <div className="flex items-center justify-center mt-1">
                {/* Default subtle curved smile */}
                <svg
                  width="9"
                  height="4.5"
                  viewBox="0 0 9 4.5"
                  fill="none"
                  className={`transition-all duration-200 ${open ? 'hidden' : 'block group-hover:hidden'}`}
                >
                  <path
                    d="M1.2 1.2 Q 4.5 4 7.8 1.2"
                    stroke="#0b1120"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Expressive Open Smile (on Hover or Active attention state) */}
                <svg
                  width="9"
                  height="5.5"
                  viewBox="0 0 9 5.5"
                  className={`transition-all duration-200 ${open ? 'block' : 'hidden group-hover:block'}`}
                >
                  <path
                    d="M1.2 1.2 Q 4.5 1.4 7.8 1.2 Q 7.4 5.2 4.5 5.2 Q 1.6 5.2 1.2 1.2 Z"
                    fill="#0b1120"
                  />
                  <path
                    d="M3 3.6 Q 4.5 5.2 6 3.6 Q 4.5 2.9 3 3.6 Z"
                    fill="#f472b6"
                    opacity="0.9"
                  />
                </svg>
              </div>
            </div>
          </span>
        </span>
      </button>
    </>
  );
}
