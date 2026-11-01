import { describe, expect, it } from 'vitest';
import { contrastRatio, readColorTokens } from '@/test/contrast';
import baseCss from './base.css?raw';
import fontsCss from './fonts.css?raw';
import indexCss from './index.css?raw';
import tokensCss from './tokens.css?raw';

const colors = readColorTokens(tokensCss);

/** WCAG 2.2 AA: 4.5:1 for text (1.4.3). */
const TEXT = 4.5;
/** WCAG 2.2 AA: 3:1 for the parts of controls and focus indicators (1.4.11, 2.4.11). */
const NON_TEXT = 3;

// [foreground token, background token, minimum ratio]. Every pair the design allows is listed.
// The same table, with the measured ratios, is recorded in docs/DESIGN_SYSTEM.md.
const pairs = [
  ['text-primary', 'surface', TEXT],
  ['text-primary', 'surface-muted', TEXT],
  ['text-primary', 'accent', TEXT],
  ['text-primary', 'accent-hover', TEXT],
  ['text-secondary', 'surface', TEXT],
  ['text-secondary', 'surface-muted', TEXT],
  ['text-inverse', 'surface-inverse', TEXT],
  ['text-inverse-secondary', 'surface-inverse', TEXT],
  ['text-on-accent', 'accent', TEXT],
  ['text-on-accent', 'accent-hover', TEXT],
  ['text-on-status', 'danger', TEXT],
  ['text-on-status', 'success', TEXT],
  ['accent', 'surface-inverse', TEXT],
  ['accent-text', 'surface', TEXT],
  ['accent-text', 'surface-muted', TEXT],
  ['danger', 'surface', TEXT],
  ['danger', 'surface-muted', TEXT],
  ['success', 'surface', TEXT],
  ['success', 'surface-muted', TEXT],
  ['border-strong', 'surface', NON_TEXT],
  ['border-strong', 'surface-muted', NON_TEXT],
  ['focus-ring', 'surface', NON_TEXT],
  ['focus-ring', 'surface-muted', NON_TEXT],
  ['focus-ring', 'accent', NON_TEXT],
  ['focus-ring-inverse', 'surface-inverse', NON_TEXT],
] as const;

// Tokens that are never text and never mark a control, so no minimum applies to them.
const decorativeOnly = ['border'];

describe('color tokens', () => {
  it.each(pairs)('%s on %s is at least %s:1', (foreground, background, minimum) => {
    expect(colors[foreground], `${foreground} is defined`).toBeDefined();
    expect(colors[background], `${background} is defined`).toBeDefined();
    expect(contrastRatio(colors[foreground], colors[background])).toBeGreaterThanOrEqual(minimum);
  });

  it('checks every color token in at least one pair, or marks it decorative', () => {
    const checked = new Set<string>([...pairs.flat().filter((value) => typeof value === 'string')]);

    for (const name of Object.keys(colors)) {
      expect(checked.has(name) || decorativeOnly.includes(name), `${name} is checked`).toBe(true);
    }
  });

  it('uses the approved brand colors', () => {
    expect(colors['surface-inverse']).toBe('#0f172a');
    expect(colors.accent).toBe('#d4af37');
  });

  it('defines the required semantic colors', () => {
    for (const name of [
      'surface',
      'surface-muted',
      'text-primary',
      'text-secondary',
      'accent',
      'accent-hover',
      'danger',
      'success',
      'border',
      'focus-ring',
    ]) {
      expect(colors[name], name).toBeDefined();
    }
  });

  it('names colors by role, not by appearance', () => {
    const literal = /(?:^|-)(?:white|black|gray|grey|slate|blue|navy|gold|yellow|red|green)(?:-|$)/;

    for (const name of Object.keys(colors)) {
      expect(literal.test(name), `${name} is a role name`).toBe(false);
    }
  });
});

describe('other tokens', () => {
  it.each([
    '--font-body',
    '--font-heading',
    '--font-code',
    '--text-heading-1',
    '--text-heading-2',
    '--text-heading-3',
    '--text-heading-4',
    '--text-body-lg',
    '--text-body:',
    '--text-body-sm',
    '--text-caption',
    '--leading-normal',
    '--font-weight-regular',
    '--font-weight-bold',
    '--spacing-4',
    '--radius-sm',
    '--radius-md',
    '--radius-lg',
    '--breakpoint-mobile',
    '--breakpoint-tablet',
    '--breakpoint-desktop',
    '--transition-duration-fast',
    '--transition-duration-normal',
    '--transition-duration-slow',
  ])('defines %s', (name) => {
    expect(tokensCss).toContain(name);
  });

  it('removes Tailwind default scales so only the tokens exist', () => {
    for (const namespace of [
      'color',
      'font',
      'font-weight',
      'text',
      'leading',
      'spacing',
      'radius',
      'breakpoint',
      'ease',
    ]) {
      expect(tokensCss).toContain(`--${namespace}-*: initial;`);
    }
  });

  it('lists a system fallback after each self-hosted font', () => {
    expect(tokensCss).toMatch(/--font-body:\s*'Inter Variable',[^;]*system-ui[^;]*sans-serif;/);
    expect(tokensCss).toMatch(/--font-code:\s*'JetBrains Mono Variable',[^;]*monospace;/);
  });
});

describe('base styles', () => {
  it('shows a focus ring for keyboard use, and a ring color for the inverse surface', () => {
    expect(baseCss).toContain(':focus-visible');
    expect(baseCss).toMatch(/outline:\s*3px solid var\(--color-focus-ring\)/);
    expect(baseCss).toContain("[data-surface='inverse']");
  });

  it('respects the reduced motion preference', () => {
    expect(baseCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(baseCss).toContain('animation-duration: 0.01ms !important');
    expect(baseCss).toContain('transition-duration: 0.01ms !important');
    expect(baseCss).toContain('scroll-behavior: auto !important');
  });

  it('sets the page colors and fonts from tokens', () => {
    expect(baseCss).toContain('background-color: var(--color-surface)');
    expect(baseCss).toContain('color: var(--color-text-primary)');
    expect(baseCss).toContain('font-family: var(--font-body)');
  });

  it('is loaded, in order, by the one stylesheet', () => {
    expect(indexCss).toContain("@import 'tailwindcss';");
    expect(indexCss.indexOf('fonts.css')).toBeLessThan(indexCss.indexOf('tokens.css'));
    expect(indexCss.indexOf('tokens.css')).toBeLessThan(indexCss.indexOf('base.css'));
  });
});

describe('fonts and policy', () => {
  it('requests nothing from another site', () => {
    for (const css of [indexCss, fontsCss, tokensCss, baseCss]) {
      expect(css).not.toMatch(/https?:\/\//);
      expect(css).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    }
  });

  it('uses font files from the installed packages, with a swap display', () => {
    expect(fontsCss).toContain("url('@fontsource-variable/inter/files/");
    expect(fontsCss).toContain("url('@fontsource-variable/jetbrains-mono/files/");
    expect(fontsCss.match(/font-display: swap;/g)).toHaveLength(2);
  });

  it('has no gradients (brand rule)', () => {
    for (const css of [indexCss, fontsCss, tokensCss, baseCss]) {
      expect(css).not.toMatch(/gradient/i);
    }
  });
});
