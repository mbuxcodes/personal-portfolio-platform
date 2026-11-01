/**
 * Contrast helpers for tests (WCAG 2.2, success criteria 1.4.3 and 1.4.11).
 * jsdom does not compute layout or colors, so the design tokens are checked here, from their values.
 */

/** Reads every `--color-<name>: #rrggbb;` declaration in a stylesheet. */
export function readColorTokens(css: string): Record<string, string> {
  const tokens: Record<string, string> = {};

  for (const match of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[match[1]] = match[2].toLowerCase();
  }

  return tokens;
}

function channelToLinear(channel: number): number {
  const value = channel / 255;

  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** The relative luminance of a `#rrggbb` color, from 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const number = Number.parseInt(hex.slice(1), 16);
  const red = channelToLinear((number >> 16) & 255);
  const green = channelToLinear((number >> 8) & 255);
  const blue = channelToLinear(number & 255);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** The contrast ratio of two `#rrggbb` colors, from 1 to 21. The order does not matter. */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );

  return (lighter + 0.05) / (darker + 0.05);
}
