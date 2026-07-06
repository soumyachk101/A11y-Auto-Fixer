import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * About: what AccessLens actually is, next to a looping "scan terminal" that
 * replays a real run — render, audit, generate, ready. The terminal types
 * itself line by line while in view.
 */

const TERMINAL_LINES = [
  { text: "$ accesslens scan https://shelter.org", cls: "text-text" },
  { text: "✓ page rendered — 42 nodes audited", cls: "text-muted" },
  { text: "✗ 17 barriers found · 3 critical · 5 serious", cls: "text-danger" },
  { text: "⚡ writing fixes — alt text · labels · contrast", cls: "text-warning" },
  { text: "✓ 17 fixes ready — nothing auto-applied", cls: "text-success" },
] as const;

const PILLARS = [
  {
    title: "Sees the page",
    body: "A real browser renders your site — the same DOM your users get, not a guess from static HTML.",
  },
  {
    title: "Writes the code",
    body: "Each violation comes back as corrected markup: a diff you can read, judge, and apply.",
  },
  {
    title: "Keeps you in charge",
    body: "Every fix waits for your approval. AccessLens proposes; you ship.",
  },
] as const;

export function About() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-about-copy]", {
          y: 36,
          opacity: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 72%" },
        });

        gsap.from("[data-terminal]", {
          y: 48,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-terminal]", start: "top 82%" },
        });

        // Terminal types itself, then loops
        const lines = gsap.utils.toArray<HTMLElement>("[data-term-line]");
        const build = () => {
          const tl = gsap.timeline({ repeat: -1, repeatDelay: 2.4, paused: true });
          lines.forEach((line) => {
            const full = line.dataset.text ?? "";
            const proxy = { p: 0 };
            tl.set(line, { opacity: 1 });
            tl.to(proxy, {
              p: 1,
              duration: Math.max(0.35, full.length * 0.018),
              ease: "none",
              onUpdate: () => {
                line.textContent = full.slice(0, Math.round(proxy.p * full.length));
              },
            });
            tl.to({}, { duration: 0.35 });
          });
          tl.add(() => {
            /* hold, then wipe for the next loop */
          });
          tl.to({}, { duration: 1.6 });
          tl.set(lines, { opacity: 0, textContent: "" });
          return tl;
        };
        const typing = build();
        ScrollTrigger.create({
          trigger: "[data-terminal]",
          start: "top 78%",
          onEnter: () => typing.play(0),
          onLeave: () => typing.pause(),
          onEnterBack: () => typing.play(),
          onLeaveBack: () => typing.pause(),
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.utils.toArray<HTMLElement>("[data-term-line]").forEach((line) => {
          line.textContent = line.dataset.text ?? "";
          line.style.opacity = "1";
        });
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} id="about" className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
      <div className="grid items-center gap-14 lg:grid-cols-[1fr_0.95fr]">
        <div>
          <p data-about-copy className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            About
          </p>
          <h2 data-about-copy className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            An accessibility engineer <span className="text-primary">in a text box.</span>
          </h2>
          <p data-about-copy className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
            AccessLens is a scanner with hands. It loads your page in a real browser, runs the
            full WCAG 2.1 rule set, then does the part every other tool leaves to you — it writes
            the fix and reads it back out loud.
          </p>

          <div className="mt-10 flex flex-col gap-6">
            {PILLARS.map((pillar, i) => (
              <div key={pillar.title} data-about-copy className="flex gap-4">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-border font-mono text-xs text-primary">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{pillar.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{pillar.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div data-terminal className="rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40">
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
            <span className="size-2.5 rounded-full bg-danger/70" />
            <span className="size-2.5 rounded-full bg-warning/70" />
            <span className="size-2.5 rounded-full bg-success/70" />
            <span className="ml-3 font-mono text-[11px] text-muted">accesslens — scan</span>
          </div>
          <div aria-hidden="true" className="min-h-[196px] px-5 py-4 font-mono text-[12.5px] leading-[1.9] sm:text-[13px]">
            {TERMINAL_LINES.map((line) => (
              <p key={line.text} data-term-line data-text={line.text} className={`${line.cls} opacity-0`} />
            ))}
          </div>
          <p className="sr-only">
            Example scan: page rendered, 42 nodes audited, 17 barriers found, 17 fixes generated,
            nothing auto-applied.
          </p>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="font-mono text-[11px] text-muted">exit code 0 · 28.4s</span>
            <span className="rounded-full border border-success/40 px-2.5 py-0.5 font-mono text-[10px] text-success">
              ready for review
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
