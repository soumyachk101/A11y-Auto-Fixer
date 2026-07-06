import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Lens cursor: a small teal ring trailing the pointer that dilates over
 * anything interactive — the product's "lens" following your eye. Purely
 * additive (native cursor stays), desktop fine-pointers only, absent under
 * reduced motion.
 */

const INTERACTIVE = "a, button, input, [role='button'], [data-magnetic]";

export function CursorLens() {
  const ringRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const ring = ringRef.current;
      if (!ring) return;

      const xTo = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" });
      const yTo = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });

      const onMove = (e: PointerEvent) => {
        xTo(e.clientX);
        yTo(e.clientY);
        if (!ring.dataset.alive) {
          ring.dataset.alive = "1";
          gsap.set(ring, { x: e.clientX, y: e.clientY });
          gsap.to(ring, { autoAlpha: 1, duration: 0.3 });
        }
      };
      const onOver = (e: PointerEvent) => {
        const hit = (e.target as HTMLElement).closest?.(INTERACTIVE);
        gsap.to(ring, {
          scale: hit ? 2.1 : 1,
          opacity: hit ? 0.9 : 0.6,
          duration: 0.35,
          ease: "power3.out",
        });
      };
      const onLeaveWindow = () => gsap.to(ring, { autoAlpha: 0, duration: 0.3, onComplete: () => delete ring.dataset.alive });

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerover", onOver, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeaveWindow);
      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerover", onOver);
        document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
      };
    });
    return () => mm.revert();
  });

  return (
    <div
      ref={ringRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[70] -ml-3.5 -mt-3.5 size-7 rounded-full border border-primary opacity-0"
    >
      <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/70" />
    </div>
  );
}

/**
 * Magnetic pull for CTAs: elements tagged [data-magnetic] lean toward the
 * pointer and spring back. Returns a cleanup fn. Call inside a
 * (pointer:fine) + (no-reduced-motion) matchMedia block.
 */
export function initMagnetic(scope: HTMLElement): () => void {
  const cleanups: Array<() => void> = [];
  scope.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.32);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.32);
    };
    const enter = () => gsap.to(el, { scale: 1.04, duration: 0.3, ease: "power2.out" });
    const leave = () => {
      xTo(0);
      yTo(0);
      gsap.to(el, { scale: 1, duration: 0.45, ease: "elastic.out(1,0.6)" });
    };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerenter", enter, { passive: true });
    el.addEventListener("pointerleave", leave, { passive: true });
    cleanups.push(() => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    });
  });
  return () => cleanups.forEach((fn) => fn());
}
