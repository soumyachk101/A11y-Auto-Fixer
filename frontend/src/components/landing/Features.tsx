import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Feature grid: the six things AccessLens actually does. Wrappers are
 * GSAP-revealed; the inner card carries the CSS hover lift so the two
 * animation systems never fight over transform.
 */

const FEATURES = [
  {
    icon: (
      <path d="M4 5h16v12H4z M4 13l4-4 3 3 5-5 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    ),
    title: "Alt text that sees",
    body: "Claude looks at the actual image pixels and writes a description a human would — not \"image123.jpg\".",
    tag: "AI",
  },
  {
    icon: (
      <>
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
      </>
    ),
    title: "Contrast, computed",
    body: "Failing colors are nudged to the nearest WCAG-passing shade by math, keeping your palette's hue.",
    tag: "Deterministic",
  },
  {
    icon: (
      <path d="M5 7h10M5 12h14M5 17h8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    ),
    title: "Labels & ARIA",
    body: "Unnamed buttons, orphan inputs, broken roles — returned as minimal corrected markup, not advice.",
    tag: "AI",
  },
  {
    icon: (
      <path d="M6 18V9m6 9V5m6 13v-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    ),
    title: "Worst-first ranking",
    body: "Issues sorted by real-world blocking power, so three criticals never drown in forty moderates.",
    tag: "Prioritized",
  },
  {
    icon: (
      <path d="M4 9v6h4l5 4V5L8 9H4z M16 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    ),
    title: "Hear before / after",
    body: "The built-in screen-reader simulator speaks each element pre- and post-fix. Ears beat checklists.",
    tag: "Signature",
  },
  {
    icon: (
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
    title: "Export the patch",
    body: "Approved fixes leave as a unified diff or JSON report — ready for a commit, a ticket, or a PR.",
    tag: "Workflow",
  },
] as const;

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-features-head]", {
          y: 32,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        });
        ScrollTrigger.batch("[data-feature]", {
          start: "top 85%",
          once: true,
          onEnter: (els) =>
            gsap.fromTo(
              els,
              { y: 42, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.8, stagger: 0.09, ease: "power3.out", clearProps: "transform" },
            ),
        });
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} id="features" className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div data-features-head className="max-w-2xl">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">What it fixes</p>
          <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Six jobs. <span className="text-muted">Zero lectures.</span>
          </h2>
        </div>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} data-feature>
              <div className="group h-full rounded-2xl border border-border bg-bg p-6 transition-[transform,border-color] duration-300 hover:-translate-y-1.5 hover:border-primary/50">
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-xl border border-border text-primary transition-colors duration-300 group-hover:border-primary/50">
                    <svg viewBox="0 0 24 24" className="size-5.5">{f.icon}</svg>
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                    {f.tag}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
