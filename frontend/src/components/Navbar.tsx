import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Landing navbar v2. Transparent over the hero, gains a blurred surface once
 * scrolled, slips away on scroll-down and returns on scroll-up. Tracks the
 * section in view and underlines its link. Mobile: full-screen menu with a
 * staggered link reveal.
 */

function LensMark() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="size-7">
      <circle cx="14" cy="14" r="11" fill="none" stroke="var(--color-primary)" strokeWidth="1.6" />
      <circle cx="14" cy="14" r="5.5" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" />
      <circle data-pupil cx="14" cy="14" r="1.8" fill="var(--color-text)" />
      <path d="M25 14h3" stroke="var(--color-primary)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const LINKS = [
  { id: "about", label: "About" },
  { id: "why-it-matters", label: "Why it matters" },
  { id: "how-it-works", label: "How it works" },
  { id: "faq", label: "FAQ" },
] as const;

export function Navbar({ onScanClick }: { onScanClick: () => void }) {
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useGSAP(
    () => {
      ScrollTrigger.create({
        start: 40,
        end: "max",
        onToggle: (self) => setScrolled(self.isActive),
      });

      // Hide on scroll-down, return on scroll-up (only past the hero)
      const header = navRef.current;
      if (header) {
        const show = gsap
          .to(header, { yPercent: -100, duration: 0.35, ease: "power2.inOut", paused: true })
          .progress(0);
        ScrollTrigger.create({
          start: 300,
          end: "max",
          onUpdate: (self) => {
            if (menuRef.current?.dataset.open === "true") return;
            if (self.direction === 1) show.play();
            else show.reverse();
          },
          onLeaveBack: () => show.reverse(),
        });
      }

      // Active-section tracking
      for (const link of LINKS) {
        const el = document.getElementById(link.id);
        if (!el) continue;
        ScrollTrigger.create({
          trigger: el,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) setActive(link.id);
            else setActive((cur) => (cur === link.id ? null : cur));
          },
        });
      }

      const mm = gsap.matchMedia();

      // The lens logo watches the pointer
      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const pupil = navRef.current?.querySelector<SVGCircleElement>("[data-pupil]");
        const mark = pupil?.closest("svg");
        if (!pupil || !mark) return;
        const xTo = gsap.quickTo(pupil, "x", { duration: 0.5, ease: "power3" });
        const yTo = gsap.quickTo(pupil, "y", { duration: 0.5, ease: "power3" });
        const look = (e: PointerEvent) => {
          const r = mark.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          const len = Math.hypot(dx, dy) || 1;
          const reach = Math.min(1, len / 120) * 3;
          xTo((dx / len) * reach);
          yTo((dy / len) * reach);
        };
        window.addEventListener("pointermove", look, { passive: true });
        return () => window.removeEventListener("pointermove", look);
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-nav-item]", {
          y: -18,
          opacity: 0,
          duration: 0.7,
          stagger: 0.07,
          ease: "power3.out",
          delay: 0.15,
          clearProps: "transform,opacity",
        });
      });
      return () => mm.revert();
    },
    { scope: navRef },
  );

  const { contextSafe } = useGSAP({ scope: navRef });

  const setMenu = contextSafe((next: boolean) => {
    const menu = menuRef.current;
    if (!menu) return;
    setOpen(next);
    menu.dataset.open = String(next);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.style.overflow = next ? "hidden" : "";
    if (next) {
      gsap.set(menu, { display: "flex" });
      gsap.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: reduce ? 0 : 0.3, ease: "power2.out" });
      gsap.fromTo(
        menu.querySelectorAll("[data-menu-item]"),
        { y: reduce ? 0 : 26, opacity: 0 },
        { y: 0, opacity: 1, duration: reduce ? 0 : 0.5, stagger: reduce ? 0 : 0.06, ease: "power3.out", delay: reduce ? 0 : 0.08 },
      );
      firstLinkRef.current?.focus();
    } else {
      gsap.to(menu, {
        autoAlpha: 0,
        duration: reduce ? 0 : 0.25,
        ease: "power2.in",
        onComplete: () => gsap.set(menu, { display: "none" }),
      });
      toggleRef.current?.focus();
    }
  });

  return (
    <header
      ref={navRef}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) setMenu(false);
      }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-border bg-bg/85 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" data-nav-item className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
          <LensMark />
          AccessLens
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              data-nav-item
              aria-current={active === link.id ? "true" : undefined}
              className={`relative text-sm transition-colors hover:text-text ${
                active === link.id ? "text-text" : "text-muted"
              } after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:rounded-full after:bg-primary after:transition-[width] after:duration-300 ${
                active === link.id ? "after:w-full" : "after:w-0"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            data-nav-item
            data-magnetic
            onClick={onScanClick}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-ink hover:opacity-90 active:opacity-80"
          >
            Scan your site
          </button>
          <button
            ref={toggleRef}
            type="button"
            data-nav-item
            onClick={() => setMenu(!open)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-lg border border-border md:hidden"
          >
            <span className="relative block h-3.5 w-4.5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-full rounded-full bg-text transition-transform duration-300 ${open ? "translate-y-[6px] rotate-45" : ""}`}
              />
              <span
                className={`absolute left-0 top-[6px] h-0.5 w-full rounded-full bg-text transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
              />
              <span
                className={`absolute left-0 top-[12px] h-0.5 w-full rounded-full bg-text transition-transform duration-300 ${open ? "-translate-y-[6px] -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        ref={menuRef}
        id="mobile-menu"
        data-open="false"
        style={{ display: "none" }}
        className="absolute left-0 right-0 top-full z-40 h-[calc(100dvh-4rem)] flex-col gap-2 overflow-y-auto border-t border-border bg-bg px-6 py-10 md:hidden"
      >
        {LINKS.map((link, i) => (
          <a
            key={link.id}
            ref={i === 0 ? firstLinkRef : undefined}
            href={`#${link.id}`}
            data-menu-item
            onClick={() => setMenu(false)}
            className="border-b border-border py-4 font-display text-3xl font-bold tracking-tight text-text"
          >
            {link.label}
          </a>
        ))}
        <p data-menu-item className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          WCAG 2.1 AA · axe-core + Claude AI
        </p>
      </div>
    </header>
  );
}
