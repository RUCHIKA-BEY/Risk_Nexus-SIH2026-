import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { fetchGlossary } from '../../services/mlApi';

/**
 * Glossary hook: returns { key: entry } once loaded (empty object before).
 * Entries: label, definition, how_to_read, why_it_matters, verify, unit.
 */
export function useGlossary() {
  const [g, setG] = useState({});
  useEffect(() => {
    let alive = true;
    fetchGlossary().then((d) => alive && setG(d)).catch(() => {});
    return () => { alive = false; };
  }, []);
  return g;
}

/**
 * (i) button that explains a dashboard term in place.
 * Usage: <TermInfo term="cumulative_to_original_ratio" />
 */
export default function TermInfo({ term, size = 13, className = '' }) {
  const glossary = useGlossary();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const entry = glossary[term];

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!entry) return null;

  const askRex = () => {
    window.dispatchEvent(new CustomEvent('rex:ask', { detail: { question: `Explain "${entry.label}" for this project.` } }));
    setOpen(false);
  };

  return (
    <span ref={ref} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        aria-label={`What does ${entry.label} mean?`}
        aria-expanded={open}
      >
        <Info size={size} />
      </button>
      {open && (
        <span
          role="dialog"
          className="absolute z-40 left-1/2 -translate-x-1/2 top-5 w-80 max-w-[85vw] text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-4 space-y-2"
        >
          <span className="block text-sm font-semibold text-slate-900 dark:text-white">
            {entry.label}{entry.unit ? <span className="font-normal text-slate-400"> · {entry.unit}</span> : null}
          </span>
          <span className="block text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{entry.definition}</span>
          <span className="block text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <b className="text-slate-800 dark:text-slate-100">How to read it: </b>{entry.how_to_read}
          </span>
          <span className="block text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <b className="text-slate-800 dark:text-slate-100">Why it matters: </b>{entry.why_it_matters}
          </span>
          {entry.verify && entry.verify !== 'Not applicable.' && (
            <span className="block text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <b className="text-slate-800 dark:text-slate-100">What to check: </b>{entry.verify}
            </span>
          )}
          <button type="button" onClick={askRex} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
            Ask REX about this →
          </button>
        </span>
      )}
    </span>
  );
}
