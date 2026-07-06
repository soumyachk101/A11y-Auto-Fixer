import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Interactive before/after. A range slider (keyboard-accessible by nature)
 * wipes between the broken card and the fixed one — the same event card, once
 * as most sites ship it and once as AccessLens returns it.
 */

function DemoCard({ fixed }: { fixed: boolean }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-paper-ink/15 bg-white p-5 sm:p-6">
      <div>
        <div className="flex items-center justify-between">
          <p className={`font-display text-lg font-bold sm:text-xl ${fixed ? "text-paper-ink" : "text-[#b9c0c4]"}`}>
            Adoption day — Sat 10am
          </p>
          {fixed ? (
            <span className="rounded-full bg-success/15 px-2 py-0.5 font-mono text-[10px] text-[#0c7a4d]">7.4:1 AA ✓</span>
          ) : (
            <span className="rounded-full bg-danger/10 px-2 py-0.5 font-mono text-[10px] text-danger">2.1:1 ✗</span>
          )}
        </div>
        <p className={`mt-2 text-sm leading-relaxed ${fixed ? "text-paper-muted" : "text-[#ccd2d5]"}`}>
          Meet twelve dogs looking for a home. Volunteers on site, coffee's on us.
        </p>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span
          className={`grid h-9 items-center rounded-lg px-4 text-sm font-semibold ${
            fixed ? "bg-paper-ink text-paper" : "bg-[#e8ebec] text-[#c3c9cc]"
          }`}
        >
          {fixed ? "RSVP — free" : "Click here"}
        </span>
        <span className={`font-mono text-[10px] ${fixed ? "text-paper-muted" : "text-[#ccd2d5]"}`}>
          {fixed ? '<button aria-label="RSVP to adoption day">' : "<div onclick=…>"}
        </span>
      </div>
    </div>
  );
}

export function FixSlider() {
  const sectionRef = useRef<HTMLElement>(null);
  const [pos, setPos] = useState(50);

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-slider-el]", {
          y: 36,
          opacity: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 72%" },
        });
        // Nudge the wipe once on entry so the interaction is discoverable
        const proxy = { v: 50 };
        gsap.to(proxy, {
          v: 78,
          duration: 1.1,
          ease: "power2.inOut",
          yoyo: true,
          repeat: 1,
          delay: 0.5,
          onUpdate: () => setPos(Math.round(proxy.v)),
          scrollTrigger: { trigger: "[data-wipe]", start: "top 70%", once: true },
        });
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="bg-paper text-paper-ink">
      <div className="mx-auto max-w-5xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="max-w-2xl">
          <p data-slider-el className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper-muted">
            See the difference
          </p>
          <h2 data-slider-el className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Same card. <span data-mark className="al-mark">Different audience.</span>
          </h2>
          <p data-slider-el className="mt-4 text-pretty text-base leading-relaxed text-paper-muted sm:text-lg">
            Drag the lens. Left is how this card ships on most sites — gray-on-gray, a clickable
            div, nothing for a screen reader to name. Right is what AccessLens hands back.
          </p>
        </div>

        <div data-slider-el data-wipe className="relative mt-12 select-none">
          <div className="relative h-56 sm:h-52">
            {/* Fixed version underneath */}
            <div className="absolute inset-0">
              <DemoCard fixed />
            </div>
            {/* Broken version clipped on top */}
            <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} aria-hidden="true">
              <DemoCard fixed={false} />
            </div>
            {/* Wipe handle */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-paper-ink"
              style={{ left: `${pos}%` }}
            >
              <span className="absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-paper-ink bg-paper font-mono text-[10px] font-bold">
                ⇄
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <span className="font-mono text-[10px] uppercase tracking-wider text-danger">before</span>
            <input
              type="range"
              min={0}
              max={100}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              aria-label="Reveal the broken version (left) versus the fixed version (right)"
              className="h-1.5 flex-1 cursor-ew-resize appearance-none rounded-full bg-paper-ink/20 accent-[#14212b]"
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#0c7a4d]">after ✓</span>
          </div>
        </div>
      </div>
    </section>
  );
}
