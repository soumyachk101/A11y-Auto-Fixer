import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { speak, speechAvailable, type SpeakHandle } from "../lib/speech";

/**
 * The signature element (Docs/03 §6, PRD F8): Before/After screen-reader
 * players. The announcement caption highlights word-by-word as it's spoken —
 * the page shows exactly what assistive tech users hear. Captions are always
 * visible text; audio is the enhancement.
 */

function Waveform({ playing }: { playing: boolean }) {
  const reduced = useReducedMotion();
  return (
    <span aria-hidden="true" className="flex h-4 items-end gap-[3px]">
      {[0.5, 0.9, 0.65, 1, 0.75].map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-current"
          style={{
            height: `${h * 100}%`,
            opacity: playing ? 1 : 0.35,
            animation:
              playing && !reduced ? `al-wave 600ms ease-in-out ${i * 90}ms infinite alternate` : "none",
          }}
        />
      ))}
    </span>
  );
}

function Player({
  label,
  text,
  tone,
}: {
  label: "Before" | "After";
  text: string;
  tone: "before" | "after";
}) {
  const [playing, setPlaying] = useState(false);
  const [spokenChars, setSpokenChars] = useState(-1);
  const handleRef = useRef<SpeakHandle | null>(null);

  useEffect(() => () => handleRef.current?.cancel(), []);

  const toggle = () => {
    if (playing) {
      handleRef.current?.cancel();
      return;
    }
    setPlaying(true);
    setSpokenChars(0);
    handleRef.current = speak(text, {
      onWord: (charIndex) => setSpokenChars(charIndex),
      onEnd: () => {
        setPlaying(false);
        setSpokenChars(-1);
      },
    });
  };

  const words: Array<{ word: string; start: number }> = [];
  let cursor = 0;
  for (const word of text.split(" ")) {
    words.push({ word, start: cursor });
    cursor += word.length + 1;
  }

  const accent = tone === "after" ? "text-success" : "text-muted";
  const border = tone === "after" ? "border-success/30" : "border-border";

  return (
    <div className={`rounded-lg border ${border} bg-surface-2 p-3`}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`font-mono text-[11px] uppercase tracking-wider ${accent}`}>
          {label}
        </span>
        <span className={accent}>
          <Waveform playing={playing} />
        </span>
      </div>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={!speechAvailable()}
          aria-label={
            playing ? `Stop ${label.toLowerCase()} announcement` : `Play ${label.toLowerCase()} announcement`
          }
          title={speechAvailable() ? undefined : "Speech synthesis unavailable — caption shown below"}
          className={`grid size-9 shrink-0 place-items-center rounded-full border ${border} bg-surface transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40 ${accent}`}
        >
          {playing ? (
            <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden="true">
              <rect x="3" y="3" width="10" height="10" rx="1.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden="true">
              <path d="M4.5 2.7a1 1 0 0 1 1.53-.85l8 5.3a1 1 0 0 1 0 1.7l-8 5.3a1 1 0 0 1-1.53-.85V2.7Z" />
            </svg>
          )}
        </button>
        <p className="min-w-0 pt-1 font-mono text-sm leading-relaxed">
          <span className="sr-only">Screen reader announces: </span>
          {words.map(({ word, start }, i) => {
            const spoken = spokenChars >= 0 && start <= spokenChars;
            return (
              <span
                key={i}
                className="transition-colors duration-150"
                style={{
                  color: spoken
                    ? tone === "after"
                      ? "var(--color-success)"
                      : "var(--color-focus)"
                    : spokenChars >= 0
                      ? "var(--color-muted)"
                      : "var(--color-text)",
                }}
              >
                {word}{" "}
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
}

export function SrSimulator({ before, after }: { before: string | null; after: string | null }) {
  if (!before && !after) return null;
  return (
    <section aria-label="Screen reader simulation">
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
        Screen reader
      </h3>
      <div className="grid gap-2">
        {before && <Player label="Before" text={before} tone="before" />}
        {after && <Player label="After" text={after} tone="after" />}
      </div>
    </section>
  );
}
