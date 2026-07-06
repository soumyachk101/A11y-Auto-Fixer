import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * FAQ accordion. Buttons with aria-expanded control GSAP height animations;
 * one panel open at a time.
 */

const QA = [
  {
    q: "Will it change my site automatically?",
    a: "No. AccessLens never touches your site. It proposes fixes as readable diffs; you approve, dismiss, or edit each one, then export the patch yourself.",
  },
  {
    q: "What exactly does it check?",
    a: "The full axe-core WCAG 2.1 A/AA rule set plus best-practice rules like heading order and landmark regions — the same engine behind most professional audits, run in a real rendered browser.",
  },
  {
    q: "How are alt texts written?",
    a: "Claude is shown the actual image, not the filename. It describes what's in the picture the way a person would say it aloud. Fixes it can't be confident about arrive flagged for review instead of guessed.",
  },
  {
    q: "How are color fixes chosen?",
    a: "Pure math, no AI. The failing color is walked to the nearest shade that passes the required contrast ratio while keeping its hue, so your brand survives the fix.",
  },
  {
    q: "Is AccessLens itself accessible?",
    a: "Dogfooded. This page passes its own scan: visible focus everywhere, reduced-motion fallbacks for every animation, and the screen-reader simulator you see is the one we test with.",
  },
] as const;

export function Faq() {
  const sectionRef = useRef<HTMLElement>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const { contextSafe } = useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-faq-item]", {
          y: 28,
          opacity: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        });
      });
      // First panel starts open
      const first = sectionRef.current?.querySelector<HTMLElement>('[data-faq-panel="0"]');
      if (first) gsap.set(first, { height: "auto" });
    },
    { scope: sectionRef },
  );

  const toggle = contextSafe((idx: number) => {
    const next = openIdx === idx ? null : idx;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = reduce ? 0 : 0.45;
    const panels = gsap.utils.toArray<HTMLElement>("[data-faq-panel]", sectionRef.current);
    panels.forEach((panel) => {
      const i = Number(panel.dataset.faqPanel);
      gsap.to(panel, {
        height: i === next ? "auto" : 0,
        duration: dur,
        ease: "power2.inOut",
      });
    });
    setOpenIdx(next);
  });

  return (
    <section ref={sectionRef} id="faq" className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">FAQ</p>
          <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Fair <span className="text-primary">questions.</span>
          </h2>
          <p className="mt-4 max-w-sm text-muted">
            The short version: nothing ships without you, and nothing is guessed silently.
          </p>
        </div>

        <div>
          {QA.map((item, i) => {
            const open = openIdx === i;
            return (
              <div key={item.q} data-faq-item className="border-b border-border first:border-t">
                <h3>
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    aria-expanded={open}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-button-${i}`}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-lg font-semibold tracking-tight transition-colors hover:text-primary"
                  >
                    {item.q}
                    <span
                      aria-hidden="true"
                      className={`grid size-8 shrink-0 place-items-center rounded-full border border-border font-mono text-sm text-muted transition-transform duration-300 ${
                        open ? "rotate-45 text-primary" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-button-${i}`}
                  data-faq-panel={i}
                  className="h-0 overflow-hidden"
                >
                  <p className="pb-6 pr-10 text-sm leading-relaxed text-muted sm:text-base">{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
