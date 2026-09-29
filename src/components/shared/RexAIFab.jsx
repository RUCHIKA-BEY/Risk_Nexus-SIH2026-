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

function SparkleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 l1.5 5.5 L19 9 l-5.5 1.5 L12 16 l-1.5-5.5 L5 9 l5.5-1.5Z" />
      <path d="M18 14 l.75 2.25 L21 17 l-2.25.75 L18 20 l-.75-2.25 L15 17 l2.25-.75Z" opacity="0.8" />
    </svg>
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
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  const ctx = routeContext(location);

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
          className="fixed z-50 bottom-24 right-4 sm:right-6 w-[min(420px,calc(100vw-2rem))] h-[min(600px,calc(100vh-8rem))] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <span className="text-blue-600 dark:text-blue-400"><SparkleIcon size={18} /></span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">REX AI Assistant</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {ctx.projectId ? `Project ${ctx.projectId}${ctx.asOf ? ` · as of ${ctx.asOf}` : ''}` : ctx.page || 'Risk Nexus'}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close REX"
              className="ml-auto p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
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

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={open ? 'Close REX AI assistant' : 'Open REX AI assistant'}
        aria-expanded={open}
        title="REX AI"
        className="fixed bottom-6 right-6 z-50 group"
        style={{ isolation: 'isolate' }}
      >
        {/* Label — visible on hover */}
        <span
          className={`
            absolute bottom-full mb-2.5 right-0
            whitespace-nowrap px-2.5 py-1.5 rounded-lg
            text-xs font-bold tracking-wide
            bg-slate-900 dark:bg-white
            text-white dark:text-slate-900
            shadow-lg
            transition-all duration-200
            pointer-events-none
            ${hovered && !open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}
          `}
        >
          REX AI Assistant
          <span className="absolute bottom-[-5px] right-4 w-2.5 h-2.5 bg-slate-900 dark:bg-white rotate-45" />
        </span>

        {/* Outer ring — blue gradient border */}
        <span
          className="block rounded-full p-[2px] shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #6366f1 100%)' }}
        >
          {/* Inner circle */}
          <span
            className="flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white transition-all duration-200"
            style={{ width: 52, height: 52 }}
          >
            {open ? <X size={20} /> : <SparkleIcon />}
          </span>
        </span>
      </button>
    </>
  );
}
