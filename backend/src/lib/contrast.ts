/**
 * WCAG 2.1 contrast math — fully deterministic, no AI (Docs/07 §B4).
 *
 * ratio = (L1 + 0.05) / (L2 + 0.05), L = relative luminance.
 * Pass: normal text >= 4.5:1, large text (>=18.66px bold or >=24px) >= 3:1.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseColor(input: string): Rgb | null {
  const s = input.trim().toLowerCase();

  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex?.[1]) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  const rgb = s.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (rgb) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  }

  return null;
}

export function toHex({ r, g, b }: Rgb): string {
  const h = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

function channelLuminance(c255: number): number {
  const c = c255 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(rgb: Rgb): number {
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [l1, l2] = la >= lb ? [la, lb] : [lb, la];
  return (l1 + 0.05) / (l2 + 0.05);
}

/** AA threshold for the given font metrics. */
export function requiredRatio(fontSizePx: number, fontWeight: number): number {
  const isLarge = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
  return isLarge ? 3 : 4.5;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

/**
 * Find the compliant foreground color nearest to the original: keep the
 * background, blend the foreground toward black AND toward white (preserves
 * hue), binary-search the minimal blend in each direction that passes, and
 * return whichever direction changed the color least.
 */
export function nearestCompliantColor(fg: Rgb, bg: Rgb, targetRatio: number): Rgb {
  if (contrastRatio(fg, bg) >= targetRatio) return fg;

  const search = (toward: Rgb): { color: Rgb; t: number } | null => {
    if (contrastRatio(toward, bg) < targetRatio) return null; // even 100% blend fails
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (contrastRatio(mix(fg, toward, mid), bg) >= targetRatio) hi = mid;
      else lo = mid;
    }
    return { color: mix(fg, toward, hi), t: hi };
  };

  const dark = search(BLACK);
  const light = search(WHITE);

  if (dark && light) return (dark.t <= light.t ? dark : light).color;
  if (dark) return dark.color;
  if (light) return light.color;
  // Degenerate background (mid-gray) — pick the higher-contrast pole.
  return contrastRatio(BLACK, bg) >= contrastRatio(WHITE, bg) ? BLACK : WHITE;
}
