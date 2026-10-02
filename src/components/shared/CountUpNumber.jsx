import { useState, useEffect, useRef } from 'react';

/**
 * Intelligent parser that extracts numeric target and formatting configuration
 * from strings or numbers without corrupting the original value.
 */
function extractNumberConfig(raw, format, formatter) {
  // If a custom formatter is passed and raw is numeric
  if (typeof raw === 'number' && !isNaN(raw)) {
    return {
      isValid: true,
      target: raw,
      decimals: Number.isInteger(raw) ? 0 : 1,
      prefix: '',
      suffix: '',
      hasCommas: Math.abs(raw) >= 1000,
      customFormatter: formatter,
    };
  }

  if (raw === null || raw === undefined || raw === '') {
    return { isValid: false, target: null, fallback: '—' };
  }

  const str = String(raw).trim();

  // If raw is a ratio like "102 / 213"
  const ratioMatch = str.match(/^([^\d]*)(\d[\d,]*)(?:\s*\/\s*)(\d[\d,]*)(.*)$/);
  if (ratioMatch) {
    const prefix = ratioMatch[1] || '';
    const num = parseFloat(ratioMatch[2].replace(/,/g, ''));
    const total = ratioMatch[3];
    const rest = ratioMatch[4] || '';
    if (!isNaN(num)) {
      return {
        isValid: true,
        target: num,
        decimals: 0,
        prefix,
        suffix: ` / ${total}${rest}`,
        hasCommas: ratioMatch[2].includes(','),
        customFormatter: null,
      };
    }
  }

  // General pattern: Prefix + Numeric (with optional commas/decimals/signs) + Suffix
  // e.g. "₹22,600.1K Cr", "13,497", "85%", "+12.4%"
  const match = str.match(/^([^\d.-]*)([-+]?\d[\d,]*\.?\d*)(.*)$/);
  if (match) {
    const prefix = match[1] || '';
    const numStr = match[2];
    const suffix = match[3] || '';
    const cleanNum = parseFloat(numStr.replace(/,/g, ''));

    if (!isNaN(cleanNum)) {
      const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;
      return {
        isValid: true,
        target: cleanNum,
        decimals,
        prefix,
        suffix,
        hasCommas: numStr.includes(','),
        customFormatter: null,
      };
    }
  }

  // If we cannot parse a valid numeric target, safely fallback to the original string
  return { isValid: false, target: null, fallback: str };
}

function formatWithIndianCommas(val, decimals) {
  const fixed = val.toFixed(decimals);
  if (decimals > 0) {
    const [intPart, decPart] = fixed.split('.');
    return `${parseInt(intPart, 10).toLocaleString('en-IN')}.${decPart}`;
  }
  return parseInt(fixed, 10).toLocaleString('en-IN');
}

/**
 * Ease In Out Cubic:
 * S-curve with soft start -> readable continuous progress -> graceful finish.
 */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function CountUpNumber({
  value,
  rawTarget,
  duration = 2400,
  formatter,
  format,
  className = '',
}) {
  // 1. Determine effective target
  const effectiveRaw = rawTarget !== undefined && rawTarget !== null ? rawTarget : value;
  const config = extractNumberConfig(effectiveRaw, format, formatter);

  // SAFE FALLBACK: If value is not a valid number or cannot be parsed, NEVER display 0.
  // Immediately return the fallback / original string.
  if (!config.isValid || config.target === null || isNaN(config.target)) {
    return <span className={className}>{config.fallback ?? value ?? '—'}</span>;
  }

  const target = config.target;

  // 2. State for animated number
  const [displayNumber, setDisplayNumber] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      return target;
    }
    return 0;
  });

  const displayRef = useRef(displayNumber);
  displayRef.current = displayNumber;

  const animStateRef = useRef({
    target: target,
    isComplete: false,
  });

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (prefersReducedMotion) {
      setDisplayNumber(target);
      animStateRef.current = { target, isComplete: true };
      return;
    }

    // If target is unchanged and animation has already completed, do nothing
    if (animStateRef.current.target === target && animStateRef.current.isComplete) {
      return;
    }

    // Start interpolation from current display number toward new target
    const startVal = displayRef.current;
    animStateRef.current = { target, isComplete: false };

    if (startVal === target) {
      setDisplayNumber(target);
      animStateRef.current.isComplete = true;
      return;
    }

    let startTimestamp = null;
    let animationFrameId = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);
      const current = startVal + (target - startVal) * easedProgress;

      setDisplayNumber(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayNumber(target); // Absolute final exact precision
        animStateRef.current = { target, isComplete: true };
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [target, duration]);

  // 3. Formatting the rendered output
  // When reached target, return the exact backend string if passed as string and no custom formatter
  const isFinished = animStateRef.current.isComplete || displayNumber === target;

  if (isFinished && typeof value === 'string' && !formatter) {
    return <span className={className}>{value}</span>;
  }

  // Custom Formatter
  if (typeof formatter === 'function') {
    return <span className={className}>{formatter(displayNumber, isFinished)}</span>;
  }

  // Built-in Indian & Decimals formatting
  let formattedText;
  if (config.hasCommas) {
    formattedText = formatWithIndianCommas(displayNumber, config.decimals);
  } else if (config.decimals > 0) {
    formattedText = displayNumber.toFixed(config.decimals);
  } else {
    formattedText = Math.round(displayNumber).toString();
  }

  return (
    <span className={className}>
      {config.prefix}
      {formattedText}
      {config.suffix}
    </span>
  );
}
