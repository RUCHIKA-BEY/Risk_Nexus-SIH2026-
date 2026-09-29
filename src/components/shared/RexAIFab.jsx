import { useState } from 'react';

/**
 * REX AI Floating Action Button
 *
 * Rendered at a fixed position in the viewport — never nested inside
 * a scrollable or overflow-hidden container.
 */

function SparkleIcon({ size = 20 }) {
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
      <path d="M18 14 l.75 2.25 L21 17 l-2.25.75 L18 20 l-.75-2.25 L15 17 l2.25-.75Z" opacity="0.8" />
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
          ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}
        `}
      >
        REX AI Assistant
        <span className="absolute bottom-[-5px] right-4 w-2.5 h-2.5 bg-slate-900 dark:bg-white rotate-45" />
      </span>

      {/* Outer ring — blue gradient border */}
      <span
        className="block rounded-full p-[2px] shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #6366f1 100%)',
        }}
      >
        {/* Inner circle */}
        <span
          className="
            flex items-center justify-center
            w-13 h-13
            rounded-full
            bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600
            text-white
            transition-all duration-200
          "
          style={{ width: 52, height: 52 }}
        >
          <SparkleIcon />
        </span>
      </span>
    </button>
  );
}
