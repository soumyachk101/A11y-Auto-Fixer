import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Footer v2: giant outlined wordmark whose letters rise with scroll, link
 * columns, back-to-top. The wordmark is decorative — the real name lives in
 * the column text.
 */

const WORDMARK = "AccessLens".split("");

export function BigFooter({
  onSampleClick,
  onScanClick,
}: {
  onSampleClick: () => void;
  onScanClick: () => void;
}) {
  const footerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-wordmark-char]", {
          yPercent: 60,
          opacity: 0,
          stagger: 0.045,
          ease: "power3.out",
          duration: 0.9,
          scrollTrigger: { trigger: "[data-wordmark]", start: "top 92%" },
        });
        gsap.from("[data-footer-col]", {
          y: 24,
          opacity: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: footerRef.current, start: "top 85%" },
        });
      });
    },
    { scope: footerRef },
  );

  return (
    <footer ref={footerRef} className="overflow-hidden border-t border-border">
      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div data-footer-col className="max-w-xs">
            <p className="font-display text-lg font-bold tracking-tight">AccessLens</p>
            <p className="mt-1.5 text-sm text-muted">
              Find it. Fix it. Ship accessible. The scanner that writes the code, reads it aloud,
              and waits for your yes.
            </p>
            <button
              type="button"
              onClick={onScanClick}
              className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-ink hover:opacity-90 active:opacity-80"
            >
              Scan your site
            </button>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-12">
            <div data-footer-col className="flex flex-col gap-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Product</p>
              <a href="#about" className="text-sm text-muted transition-colors hover:text-text">About</a>
              <a href="#features" className="text-sm text-muted transition-colors hover:text-text">What it fixes</a>
              <a href="#how-it-works" className="text-sm text-muted transition-colors hover:text-text">How it works</a>
              <button
                type="button"
                onClick={onSampleClick}
                className="text-left text-sm text-muted transition-colors hover:text-text"
              >
                Sample scan
              </button>
            </div>
            <div data-footer-col className="flex flex-col gap-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Learn</p>
              <a href="#why-it-matters" className="text-sm text-muted transition-colors hover:text-text">Why it matters</a>
              <a href="#faq" className="text-sm text-muted transition-colors hover:text-text">FAQ</a>
            </div>
            <div data-footer-col className="flex flex-col gap-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Standards</p>
              <p className="text-sm text-muted">WCAG 2.1 AA</p>
              <p className="text-sm text-muted">axe-core + Claude AI</p>
            </div>
          </nav>
        </div>

        {/* Giant wordmark */}
        <p
          data-wordmark
          aria-hidden="true"
          className="mt-14 flex justify-center overflow-hidden font-display font-bold leading-[0.85] tracking-tight"
        >
          {WORDMARK.map((ch, i) => (
            <span
              key={i}
              data-wordmark-char
              className="inline-block text-[clamp(3rem,11.5vw,10.5rem)] text-transparent [-webkit-text-stroke:1.5px_var(--color-border)]"
            >
              {ch}
            </span>
          ))}
        </p>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6">
          <p className="font-mono text-[11px] text-muted">
            AccessLens · dogfooded — this page passes its own scan
          </p>
          <a href="#top" className="font-mono text-[11px] uppercase tracking-widest text-muted transition-colors hover:text-text">
            back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
