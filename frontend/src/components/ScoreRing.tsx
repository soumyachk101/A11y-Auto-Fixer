import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * Score badge (Docs/06 §3.3): before → after ring gauge, animated count-up,
 * band color + numeric label (never color alone).
 */

function band(score: number): { stroke: string; label: string } {
  if (score >= 90) return { stroke: "var(--color-success)", label: "good" };
  if (score >= 60) return { stroke: "var(--color-warning)", label: "needs work" };
  return { stroke: "var(--color-danger)", label: "poor" };
}

export function ScoreRing({ before, after }: { before: number; after: number }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? after : before);
  const prev = useRef(before);

  useEffect(() => {
    if (reduced) {
      setDisplay(after);
      return;
    }
    const controls = animate(prev.current, after, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    prev.current = after;
    return () => controls.stop();
  }, [after, reduced]);

  const { stroke, label } = band(display);
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - display / 100);

  return (
    <div
      className="flex items-center gap-3"
      role="status"
      aria-live="polite"
      aria-label={`Accessibility score ${after} out of 100, ${band(after).label}. Started at ${before}.`}
    >
      <div className="relative size-14" aria-hidden="true">
        <svg viewBox="0 0 60 60" className="size-14 -rotate-90">
          <circle cx="30" cy="30" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="5" />
          <circle
            cx="30"
            cy="30"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: reduced ? "none" : "stroke-dashoffset 120ms linear, stroke 200ms" }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-mono text-base font-semibold tabular-nums">
          {display}
        </span>
      </div>
      <div aria-hidden="true">
        <div className="text-xs text-muted">
          Score{" "}
          {after !== before && (
            <span className="font-mono tabular-nums">
              {before} <span className="text-muted">→</span>{" "}
              <span style={{ color: stroke }}>{after}</span>
            </span>
          )}
        </div>
        <div className="font-mono text-[11px] uppercase tracking-wider" style={{ color: stroke }}>
          {label}
        </div>
      </div>
    </div>
  );
}
