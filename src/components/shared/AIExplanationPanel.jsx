import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronRight, MessageCircle, AlertTriangle, TrendingUp, Network, ShieldCheck, ListChecks } from 'lucide-react';
import TermInfo from './TermInfo';

const LEVEL_STYLE = {
  HIGH: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  LOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};
const PRIORITY_STYLE = {
  immediate: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'next review': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  monitor: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};
const TARGET_TERM = { cost: 'cost_event', schedule: 'schedule_event', compound: 'compound_event' };

function Section({ icon: Icon, title, term, children }) {
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {Icon && <Icon size={14} />} {title} {term && <TermInfo term={term} size={12} />}
      </h4>
      {children}
    </section>
  );
}

function DriverRow({ d, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const up = d.effect.includes('raises');
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-lg"
        aria-expanded={open}
      >
        <span className={`w-1.5 self-stretch rounded-full ${up ? 'bg-rose-400' : 'bg-emerald-400'}`} />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{d.label}</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            {d.this_project} · {d.effect} for {d.targets.join(', ')}
          </span>
        </span>
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>
      {open && (
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 px-4 pb-4 pl-8 text-xs leading-relaxed">
          <div><dt className="font-semibold text-slate-700 dark:text-slate-200">What it means</dt><dd className="text-slate-600 dark:text-slate-300">{d.what_it_means}</dd></div>
          <div><dt className="font-semibold text-slate-700 dark:text-slate-200">Compared with similar projects</dt><dd className="text-slate-600 dark:text-slate-300">{d.typical_peer}</dd></div>
          <div><dt className="font-semibold text-slate-700 dark:text-slate-200">Why it affects this project's risk</dt><dd className="text-slate-600 dark:text-slate-300">{d.why_it_affects_risk}</dd></div>
          <div><dt className="font-semibold text-slate-700 dark:text-slate-200">What to verify</dt><dd className="text-slate-600 dark:text-slate-300">{d.what_to_verify}</dd></div>
        </dl>
      )}
    </div>
  );
}

/**
 * Renders the /ai/explain/deep response.
 * Props: data (response), projectId, asOf.
 */
export default function AIExplanationPanel({ data, projectId, asOf }) {
  if (!data) return null;
  const ask = (question) =>
    window.dispatchEvent(new CustomEvent('rex:ask', { detail: { question, projectId, asOf } }));

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 p-5 space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles size={18} className="text-violet-600 dark:text-violet-300" />
        <h3 className="text-base font-bold text-violet-900 dark:text-white">AI Explanation</h3>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">
          {data.source === 'gemini' ? `Gemini · ${data.model}` : 'Rule-based (no AI key)'}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">Data month {data.data_row_month}</span>
      </div>

      <div className="space-y-2">
        <p className="text-base font-semibold text-slate-900 dark:text-white leading-snug">{data.headline}</p>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-4xl">{data.overview}</p>
      </div>

      <Section title="What each score means" term="risk_score">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {data.targets.map((t) => (
            <div key={t.target} className="rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold capitalize text-slate-800 dark:text-slate-100">{t.target}</span>
                <TermInfo term={TARGET_TERM[t.target]} size={12} />
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${LEVEL_STYLE[t.risk_level] || LEVEL_STYLE.LOW}`}>{t.risk_level}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{t.score_points} pts · threshold {t.threshold_points}</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{t.meaning}</p>
              {t.reasons?.length > 0 && (
                <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                  {t.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Drivers, explained" term="shap_value">
        <div className="space-y-2">
          {data.drivers.map((d, i) => <DriverRow key={d.feature} d={d} defaultOpen={i === 0} />)}
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section icon={Network} title="What-if network" term="fcm">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{data.scenario}</p>
        </Section>
        <Section icon={TrendingUp} title="Trend">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{data.trend}</p>
        </Section>
      </div>

      <Section icon={ListChecks} title="Recommended checks">
        <ul className="space-y-2">
          {data.actions.map((a, i) => (
            <li key={i} className="flex items-start gap-3 text-xs">
              <span className={`shrink-0 px-2 py-0.5 rounded-full font-semibold ${PRIORITY_STYLE[a.priority] || PRIORITY_STYLE.monitor}`}>{a.priority}</span>
              <span className="text-slate-700 dark:text-slate-300"><b className="text-slate-800 dark:text-slate-100">{a.action}</b> <span className="text-slate-500 dark:text-slate-400">{a.reason}</span></span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.data_gaps?.length > 0 && (
          <Section icon={AlertTriangle} title="Data gaps" term="data_quality_warning">
            <ul className="list-disc pl-4 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              {data.data_gaps.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          </Section>
        )}
        <Section icon={ShieldCheck} title="How far to trust this">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{data.reliability}</p>
        </Section>
      </div>

      {data.glossary?.length > 0 && (
        <Section title="Terms used">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {data.glossary.map((g) => (
              <div key={g.term}><dt className="font-semibold text-slate-800 dark:text-slate-100">{g.term}</dt><dd className="text-slate-600 dark:text-slate-400">{g.meaning}</dd></div>
            ))}
          </dl>
        </Section>
      )}

      {data.follow_up_questions?.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <MessageCircle size={14} className="text-violet-600 dark:text-violet-300" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Ask REX:</span>
          {data.follow_up_questions.map((q) => (
            <button key={q} type="button" onClick={() => ask(q)}
              className="text-xs px-3 py-1 rounded-full border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-200 hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500">
              {q}
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-violet-200/60 dark:border-slate-700 pt-3">{data.disclaimer}</p>
    </div>
  );
}
