import { useRef, useState, type FormEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { useAppStore } from "../store/useAppStore";
import { LensField } from "../components/LensField";
import { Navbar } from "../components/Navbar";
import { About } from "../components/landing/About";
import { Features } from "../components/landing/Features";
import { FixSlider } from "../components/landing/FixSlider";
import { Faq } from "../components/landing/Faq";
import { BigFooter } from "../components/landing/BigFooter";
import { CursorLens, initMagnetic } from "../components/landing/CursorLens";
import sampleHtml from "../fixtures/sample-site.html?raw";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * Landing (Docs/06 §3.1), v2 pass. The signature is a live screen-reader
 * walkthrough: a focus ring tabs through the hero while a ticker types what a
 * screen reader would announce at each stop — the product demoing itself.
 * Paper-and-ink section banding breaks the dark shell; "how it works" is a
 * pinned horizontal scroll on desktop.
 */

const STEPS = [
  {
    eyebrow: "01 · Detect",
    title: "Every barrier, worst first",
    body: "Playwright renders the real page, axe-core runs the WCAG 2.1 rules, and every violation is ranked by how hard it blocks real people.",
  },
  {
    eyebrow: "02 · Generate",
    title: "The fix, not a lecture",
    body: "Claude reads the actual image and writes the alt text. Labels and ARIA come back as minimal corrected markup. Colors are computed to the nearest compliant shade — pure math.",
  },
  {
    eyebrow: "03 · Hear",
    title: "Before and after, out loud",
    body: "Play what a screen reader announces before the fix — and after. Approve what's right, dismiss what isn't. Nothing ships without you.",
  },
] as const;

const STATS = [
  { value: 96, prefix: "", suffix: "%", label: "of the top million homepages fail automated WCAG checks", size: "text-[clamp(4.5rem,11vw,9rem)]" },
  { value: 6, prefix: "1 in ", suffix: "", label: "people live with a disability — your users, not edge cases", size: "text-[clamp(3.25rem,8vw,6.5rem)]" },
  { value: 30, prefix: "", suffix: "s", label: "from pasting a URL to ready-to-apply fixes", size: "text-[clamp(2.5rem,6vw,4.5rem)]" },
] as const;

const MARQUEE_RULES = [
  ["image-alt", "bg-danger"],
  ["color-contrast", "bg-serious"],
  ["label", "bg-danger"],
  ["link-name", "bg-serious"],
  ["button-name", "bg-danger"],
  ["html-has-lang", "bg-warning"],
  ["document-title", "bg-warning"],
  ["aria-required-attr", "bg-danger"],
  ["frame-title", "bg-serious"],
  ["meta-viewport", "bg-warning"],
  ["list", "bg-warning"],
  ["tabindex", "bg-serious"],
] as const;

function StepVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-2">
        {[
          ["bg-danger", "CRITICAL", "w-3/4"],
          ["bg-serious", "SERIOUS", "w-2/3"],
          ["bg-warning", "MODERATE", "w-1/2"],
        ].map(([dot, label, w], i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-lg border border-border bg-bg px-3 py-2.5">
            <span className={`size-1.5 rounded-full ${dot}`} />
            <span className="font-mono text-[10px] tracking-wider text-muted">{label}</span>
            <span className={`h-1.5 rounded-full bg-surface-2 ${w}`} />
          </div>
        ))}
      </div>
    );
  }
  if (index === 1) {
    return (
      <div aria-hidden="true" className="overflow-hidden rounded-lg border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed">
        <p className="text-danger/80">
          <span className="mr-2 select-none text-muted">−</span>
          {"<img src=\"dog.jpg\">"}
        </p>
        <p className="text-success">
          <span className="mr-2 select-none text-muted">+</span>
          {"<img src=\"dog.jpg\" alt=\"Golden"}
        </p>
        <p className="pl-5 text-success">{"retriever catching a frisbee\">"}</p>
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="flex items-center gap-3 rounded-lg border border-success/30 bg-bg px-3 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-success/40 text-success">
        <svg viewBox="0 0 16 16" className="size-3 fill-current">
          <path d="M4.5 2.7a1 1 0 0 1 1.53-.85l8 5.3a1 1 0 0 1 0 1.7l-8 5.3a1 1 0 0 1-1.53-.85V2.7Z" />
        </svg>
      </span>
      <div className="flex h-5 items-end gap-[3px] text-success" data-wave>
        {[0.5, 0.85, 0.6, 1, 0.7, 0.9, 0.55].map((h, i) => (
          <span key={i} className="w-[3px] rounded-full bg-current" style={{ height: `${h * 100}%` }} />
        ))}
      </div>
      <p className="font-mono text-[11px] text-success">
        “Golden retriever catching a frisbee, image”
      </p>
    </div>
  );
}

/** Floating "the product at work" cards in the hero's right column. */
function HeroFixCards() {
  return (
    <div aria-hidden="true" className="relative hidden lg:block">
      <div
        data-float="0"
        data-tabstop
        data-announce="Suggested fix: add alt text to dog.jpg, button"
        className="w-[340px] rounded-2xl border border-border bg-surface/80 p-4 shadow-2xl shadow-black/40 backdrop-blur-sm"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-danger">critical · image-alt</span>
          <span className="rounded-full border border-success/40 px-2 py-0.5 font-mono text-[10px] text-success">fix ready</span>
        </div>
        <div className="rounded-lg border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed">
          <p className="text-danger/80">
            <span className="mr-2 select-none text-muted">−</span>
            {"<img src=\"dog.jpg\">"}
          </p>
          <p className="text-success">
            <span className="mr-2 select-none text-muted">+</span>
            {"<img src=\"dog.jpg\" alt=\"Golden retriever…\">"}
          </p>
        </div>
      </div>

      <div
        data-float="1"
        className="ml-16 mt-5 flex w-[300px] items-center gap-3 rounded-2xl border border-border bg-surface/80 px-4 py-3.5 shadow-2xl shadow-black/40 backdrop-blur-sm"
      >
        <div className="flex h-5 items-end gap-[3px] text-primary" data-wave>
          {[0.6, 1, 0.5, 0.9, 0.7].map((h, i) => (
            <span key={i} className="w-[3px] rounded-full bg-current" style={{ height: `${h * 100}%` }} />
          ))}
        </div>
        <p className="font-mono text-[11px] leading-snug text-muted">
          “Golden retriever catching a frisbee, <span className="text-text">image</span>”
        </p>
      </div>

      <div
        data-float="2"
        className="ml-6 mt-5 flex w-[260px] items-center justify-between rounded-2xl border border-border bg-surface/80 px-4 py-3.5 shadow-2xl shadow-black/40 backdrop-blur-sm"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">contrast</span>
        <span className="font-mono text-[11px]">
          <span className="text-danger">2.9:1</span>
          <span className="mx-2 text-muted">→</span>
          <span className="text-success">4.6:1 ✓</span>
        </span>
      </div>
    </div>
  );
}

export function Landing() {
  const startScan = useAppStore((s) => s.startScan);
  const startSampleScan = useAppStore((s) => s.startSampleScan);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLSpanElement>(null);
  const stepsRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const focusScanInput = () => {
    document.getElementById("scan-url")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // ---------- Motion-safe: shared animations ----------
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Hero headline: line-masked rise
        const split = SplitText.create("[data-hero-h1]", {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1,
              stagger: 0.1,
              ease: "power3.out",
              delay: 0.1,
            }),
        });

        // Hero entrance
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from("[data-hero]", { y: 28, opacity: 0, duration: 0.9, stagger: 0.09 }, 0.35)
          .from("[data-float]", { y: 40, opacity: 0, duration: 0.9, stagger: 0.12 }, "-=0.7");

        // Hero eases out as you scroll past it
        gsap.to("[data-hero-inner]", {
          yPercent: -10,
          opacity: 0.2,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });

        // Hero cards drift
        gsap.utils.toArray<HTMLElement>("[data-float]").forEach((card, i) => {
          gsap.to(card, {
            y: i % 2 ? 10 : -12,
            duration: 3.2 + i * 0.5,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            delay: 1.2 + i * 0.3,
          });
        });

        // ---- Signature: screen-reader walkthrough. A focus ring tabs
        // through the hero; the ticker types each announcement.
        const hero = heroRef.current;
        const ring = ringRef.current;
        const ticker = tickerRef.current;
        if (hero && ring && ticker) {
          const stops = gsap.utils
            .toArray<HTMLElement>("[data-tabstop]", hero)
            .filter((el) => el.offsetParent !== null);
          const tl = gsap.timeline({ repeat: -1, delay: 1.3 });
          stops.forEach((el) => {
            const line = el.dataset.announce ?? "";
            tl.add(() => {
              if (el.offsetParent === null) return;
              const hb = hero.getBoundingClientRect();
              const eb = el.getBoundingClientRect();
              gsap.to(ring, {
                x: eb.left - hb.left - 7,
                y: eb.top - hb.top - 7,
                width: eb.width + 14,
                height: eb.height + 14,
                autoAlpha: 1,
                duration: 0.5,
                ease: "power3.inOut",
              });
            });
            tl.to({}, { duration: 0.55 });
            const proxy = { p: 0 };
            tl.to(proxy, {
              p: 1,
              duration: Math.max(0.6, line.length * 0.028),
              ease: "none",
              onStart: () => {
                ticker.textContent = "";
              },
              onUpdate: () => {
                ticker.textContent = line.slice(0, Math.round(proxy.p * line.length));
              },
            });
            tl.to({}, { duration: 1.5 });
          });
        }

        // Paper section: stat rows rise in, numbers count up once
        gsap.utils.toArray<HTMLElement>("[data-stat-row]").forEach((row) => {
          gsap.from(row, {
            y: 44,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: row, start: "top 85%" },
          });
        });
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const target = Number(el.dataset.count);
          const state = { n: 0 };
          gsap.to(state, {
            n: target,
            duration: 1.6,
            ease: "power2.out",
            snap: { n: 1 },
            onUpdate: () => {
              el.textContent = String(state.n);
            },
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        });

        // Highlighter marks sweep in
        gsap.utils.toArray<HTMLElement>("[data-mark]").forEach((markEl) => {
          gsap.fromTo(
            markEl,
            { backgroundSize: "0% 82%" },
            {
              backgroundSize: "100% 82%",
              duration: 0.8,
              ease: "power2.out",
              scrollTrigger: { trigger: markEl, start: "top 85%" },
            },
          );
        });

        // Waveforms sing while visible
        gsap.utils.toArray<HTMLElement>("[data-wave]").forEach((wave) => {
          gsap.utils.toArray<HTMLElement>("span", wave).forEach((bar, i) => {
            gsap.to(bar, {
              scaleY: 0.45,
              transformOrigin: "bottom",
              duration: 0.5,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
              delay: i * 0.09,
              scrollTrigger: { trigger: wave, start: "top 95%", toggleActions: "play pause resume pause" },
            });
          });
        });

        // CTA reveal
        gsap.from("[data-cta]", {
          y: 32,
          opacity: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-cta-section]", start: "top 78%" },
        });

        // Reading-progress hairline under the navbar
        gsap.to("[data-progress]", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: pageRef.current, start: "top top", end: "bottom bottom", scrub: 0.4 },
        });

        // Stat numbers stamp in — a little heavier than a fade
        gsap.utils.toArray<HTMLElement>("[data-stat-num]").forEach((el) => {
          gsap.from(el, {
            scale: 0.82,
            rotate: -2,
            transformOrigin: "left bottom",
            duration: 0.8,
            ease: "back.out(1.8)",
            scrollTrigger: { trigger: el, start: "top 85%" },
          });
        });

        // "everyone" waves hello while the CTA is on screen
        gsap.to("[data-wave-char]", {
          y: -7,
          duration: 0.55,
          ease: "sine.inOut",
          stagger: { each: 0.07, yoyo: true, repeat: -1, repeatDelay: 1.1 },
          scrollTrigger: {
            trigger: "[data-cta-section]",
            start: "top 85%",
            toggleActions: "play pause resume pause",
          },
        });

        return () => split.revert();
      });

      // ---------- Fine pointers: magnetic CTAs ----------
      mm.add("(prefers-reduced-motion: no-preference) and (pointer: fine)", () => {
        const cleanup = pageRef.current ? initMagnetic(pageRef.current) : undefined;
        return () => cleanup?.();
      });

      // ---------- Motion-safe + desktop: pinned horizontal steps ----------
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 1024px)", () => {
        const track = trackRef.current;
        const section = stepsRef.current;
        if (!track || !section) return;
        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: () => "+=" + (track.scrollWidth - window.innerWidth),
              pin: true,
              scrub: 0.7,
              invalidateOnRefresh: true,
            },
          })
          .to(track, { x: () => -(track.scrollWidth - window.innerWidth) }, 0)
          .to("[data-steps-progress]", { scaleX: 1 }, 0);
      });

      // ---------- Motion-safe + mobile: steps reveal vertically ----------
      mm.add("(prefers-reduced-motion: no-preference) and (max-width: 1023px)", () => {
        gsap.utils.toArray<HTMLElement>("[data-step-panel]").forEach((panel) => {
          gsap.from(panel, {
            y: 36,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: panel, start: "top 85%" },
          });
        });
      });

      // ---------- Reduced motion: static, everything readable ----------
      mm.add("(prefers-reduced-motion: reduce)", () => {
        const ticker = tickerRef.current;
        if (ticker) ticker.textContent = "AccessLens, heading level 1";
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          el.textContent = el.dataset.count ?? "";
        });
      });

      return () => mm.revert();
    },
    { scope: pageRef },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+/.test(trimmed)) {
      setError("Enter a full website address, like example.com or https://example.com.");
      return;
    }
    setError(null);
    void startScan(trimmed);
  };

  return (
    <div ref={pageRef} id="top">
      <CursorLens />
      <div
        data-progress
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left scale-x-0 bg-primary"
      />
      <Navbar onScanClick={focusScanInput} />

      {/* ---------- Hero ---------- */}
      <section ref={heroRef} className="relative flex min-h-dvh items-center overflow-hidden px-4 pt-16 sm:px-6">
        <LensField />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,transparent_30%,var(--color-bg)_85%)]"
        />

        {/* Signature focus ring — the screen-reader walkthrough cursor */}
        <div
          ref={ringRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-20 rounded-xl border-2 border-focus opacity-0 shadow-[0_0_0_4px_rgba(111,232,219,0.15),0_0_24px_rgba(111,232,219,0.25)]"
        />

        <div data-hero-inner className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="text-center lg:text-left">
            <p aria-hidden="true" data-hero className="mb-6 h-5 overflow-hidden whitespace-nowrap font-mono text-xs text-muted">
              <span className="mr-1.5 text-primary">‣</span>
              <span ref={tickerRef} />
              <span className="animate-pulse text-primary">▌</span>
            </p>

            <h1
              data-hero-h1
              className="text-balance font-display text-[clamp(3rem,7.5vw,5.5rem)] font-bold leading-[0.98] tracking-tight"
            >
              <span data-tabstop data-announce="The scanner that writes the fix, heading level 1">
                The scanner that <span className="text-primary">writes the fix.</span>
              </span>
            </h1>

            <p data-hero className="mx-auto mt-6 max-w-lg text-pretty text-base leading-relaxed text-muted lg:mx-0 sm:text-lg">
              Other tools hand you 200 WCAG violations and walk away. AccessLens reads the actual
              image, writes the alt text, corrects the markup, computes the compliant color — and
              lets you <em className="not-italic text-text">hear the difference</em> before you ship.
            </p>

            <form onSubmit={submit} noValidate data-hero className="mx-auto mt-9 flex max-w-xl flex-col gap-2 lg:mx-0">
              <div className="flex gap-2 rounded-xl border border-border bg-surface/70 p-1.5 backdrop-blur-sm transition-colors focus-within:border-primary">
                <label htmlFor="scan-url" className="sr-only">
                  Website address
                </label>
                <input
                  id="scan-url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://your-site.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "scan-url-error" : undefined}
                  data-tabstop
                  data-announce="Website address, edit text"
                  className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 font-mono text-sm outline-none placeholder:text-muted/50"
                />
                <button
                  type="submit"
                  data-tabstop
                  data-announce="Scan, button"
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-ink transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  Scan
                </button>
              </div>
              {error && (
                <p id="scan-url-error" role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
            </form>

            <p data-hero className="mt-4 text-sm text-muted">
              or{" "}
              <button
                type="button"
                onClick={() => void startSampleScan(sampleHtml)}
                data-tabstop
                data-announce="Try a sample site, button"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                try a sample site
              </button>{" "}
              — a shelter page with 17 seeded issues
            </p>

            <p data-hero className="mt-10 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              WCAG 2.1 AA · axe-core + Claude AI · nothing auto-applies
            </p>
          </div>

          <HeroFixCards />
        </div>

        <a
          href="#rule-ticker"
          aria-label="Scroll to content"
          className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 font-mono text-[11px] uppercase tracking-widest text-muted transition-colors hover:text-text"
        >
          scroll ↓
        </a>
      </section>

      {/* ---------- Rule marquee ---------- */}
      <section id="rule-ticker" aria-label="Checks AccessLens runs" className="overflow-hidden border-y border-border bg-surface/50 py-3.5">
        <div className="flex w-max motion-safe:animate-[al-marquee_32s_linear_infinite] hover:[animation-play-state:paused]">
          {[false, true].map((clone) => (
            <ul key={String(clone)} aria-hidden={clone || undefined} className="flex shrink-0 items-center">
              {MARQUEE_RULES.map(([rule, dot]) => (
                <li
                  key={rule}
                  title="hover: fixed"
                  className="group/chip mx-3 flex cursor-default items-center gap-2 rounded-full border border-border bg-bg px-3.5 py-1.5 transition-colors duration-300 hover:border-success/60"
                >
                  <span className="relative grid size-3 place-items-center">
                    <span className={`size-1.5 rounded-full transition-opacity duration-300 group-hover/chip:opacity-0 ${dot}`} />
                    <span className="absolute font-mono text-[10px] leading-none text-success opacity-0 transition-opacity duration-300 group-hover/chip:opacity-100">
                      ✓
                    </span>
                  </span>
                  <span className="font-mono text-[11px] text-muted transition-colors duration-300 group-hover/chip:text-success">
                    {rule}
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* ---------- About ---------- */}
      <About />

      {/* ---------- Why it matters (paper) ---------- */}
      <section id="why-it-matters" className="bg-paper text-paper-ink">
        <div className="mx-auto max-w-5xl px-4 py-24 sm:px-6 sm:py-32">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper-muted">Why it matters</p>
          <h2 className="max-w-2xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
            The web keeps failing{" "}
            <span data-mark className="al-mark">the eye test.</span>
          </h2>

          <div className="mt-16 flex flex-col">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                data-stat-row
                className="grid items-baseline gap-2 border-t border-paper-ink/15 py-8 first:border-t-0 sm:grid-cols-[1fr_minmax(0,340px)] sm:gap-10"
              >
                <p data-stat-num className={`font-display font-bold leading-none tracking-tight ${stat.size}`}>
                  {stat.prefix}
                  <span data-count={stat.value}>0</span>
                  {stat.suffix}
                </p>
                <p className="text-base leading-relaxed text-paper-muted sm:text-lg">{stat.label}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-2xl text-pretty text-base leading-relaxed text-paper-muted sm:text-lg">
            Every unlabeled button, every 2.9:1 gray-on-white paragraph is a door held shut.
            Detection tools count the doors. AccessLens{" "}
            <span data-mark className="al-mark font-medium text-paper-ink">opens them</span> — with the exact
            line of code, written for you.
          </p>
        </div>
      </section>

      {/* ---------- How it works (pinned horizontal on desktop) ---------- */}
      <section ref={stepsRef} id="how-it-works" className="relative overflow-hidden py-24 lg:py-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:absolute lg:inset-x-0 lg:top-20 lg:z-10">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">How it works</p>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Detection is table stakes.{" "}
                <span className="text-muted">Correction is the product.</span>
              </h2>
            </div>
            <div className="hidden w-40 shrink-0 lg:block" aria-hidden="true">
              <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                <div data-steps-progress className="h-full origin-left scale-x-0 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>

        <div
          ref={trackRef}
          className="mt-12 flex flex-col gap-6 px-4 sm:px-6 lg:mt-0 lg:h-screen lg:w-max lg:flex-row lg:gap-0 lg:px-0"
        >
          {STEPS.map((step, i) => (
            <div
              key={step.eyebrow}
              data-step-panel
              className="flex items-center justify-center lg:h-screen lg:w-screen lg:shrink-0 lg:px-16 lg:pt-24"
            >
              <div className="relative w-full max-w-3xl">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 hidden select-none font-display font-bold leading-none text-text/5 lg:-top-24 lg:block lg:text-[13rem]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="relative grid gap-5 rounded-3xl border border-border bg-surface p-7 sm:p-9 md:grid-cols-2 md:items-center">
                  <div>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">{step.eyebrow}</p>
                    <h3 className="mb-2.5 font-display text-2xl font-semibold tracking-tight">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted sm:text-base">{step.body}</p>
                  </div>
                  <StepVisual index={i} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <Features />

      {/* ---------- Before / after slider (paper) ---------- */}
      <FixSlider />

      {/* ---------- FAQ ---------- */}
      <Faq />

      {/* ---------- CTA ---------- */}
      <section data-cta-section className="border-t border-border px-4 py-28 text-center sm:px-6">
        <h2 data-cta className="mx-auto max-w-3xl text-balance font-display text-4xl font-bold tracking-tight sm:text-6xl">
          Ship a site{" "}
          <span className="text-accent">
            {"everyone".split("").map((ch, i) => (
              <span key={i} data-wave-char className="inline-block">
                {ch}
              </span>
            ))}
          </span>{" "}
          can use.
        </h2>
        <p data-cta className="mx-auto mt-5 max-w-md text-muted">
          From broken to accessible in under a minute. You approve every change.
        </p>
        <div data-cta className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={focusScanInput}
            className="rounded-lg bg-primary px-7 py-3 text-sm font-semibold text-primary-ink transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Scan your site
          </button>
          <button
            type="button"
            onClick={() => void startSampleScan(sampleHtml)}
            className="rounded-lg border border-border px-7 py-3 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary"
          >
            Try the sample
          </button>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <BigFooter
        onSampleClick={() => void startSampleScan(sampleHtml)}
        onScanClick={focusScanInput}
      />
    </div>
  );
}
