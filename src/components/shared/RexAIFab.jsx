import { useState } from 'react';

/**
 * REX AI Floating Action Button
 *
 * Rendered at a fixed position in the viewport — never nested inside
 * a scrollable or overflow-hidden container.
 *
 * Uses `isolation: isolate` on its own stacking context to avoid
 * z-index bleed from children into surrounding layers.
 */

/* Sparkle SVG icon */
function SparkleIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2 l1.5 5.5 L19 9 l-5.5 1.5 L12 16 l-1.5-5.5 L5 9 l5.5-1.5Z" />
      <path d="M18 14 l.75 2.25 L21 17 l-2.25.75 L18 20 l-.75-2.25 L15 17 l2.25-.75Z" opacity="0.7" />
    </svg>
  );
}

export default function RexAIFab() {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label="Open REX AI assistant"
      title="REX AI"
      className="fixed bottom-6 right-6 z-50"
      style={{ isolation: 'isolate' }}
    >
      {/* Outer ring — refined multi-stop border */}
      <span
        className="
          block rounded-full p-[1.5px]
          shadow-md shadow-slate-300/40 dark:shadow-slate-900/60
          transition-shadow duration-200
          hover:shadow-lg hover:shadow-slate-400/30 dark:hover:shadow-slate-800/50
        "
        style={{
          background:
            'linear-gradient(145deg, #94a3b8 0%, #cbd5e1 30%, #64748b 60%, #94a3b8 100%)',
        }}
      >
        {/* Inner circle */}
        <span
          className="
            flex items-center justify-center
            w-14 h-14
            rounded-full
            bg-white dark:bg-slate-800
            text-slate-600 dark:text-slate-300
            transition-colors duration-200
            hover:bg-slate-50 dark:hover:bg-slate-750
          "
        >
          <SparkleIcon />
        </span>
      </span>

      {/* Label — visible on hover */}
      <span
        className={`
          absolute bottom-full mb-3 right-0
          whitespace-nowrap px-2 py-1 rounded
          text-xs font-semibold tracking-wide
          bg-slate-800 dark:bg-slate-200
          text-white dark:text-slate-900
          shadow
          transition-all duration-200
          pointer-events-none
          ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        `}
      >
        REX AI
      </span>
    </button>
  );
}
