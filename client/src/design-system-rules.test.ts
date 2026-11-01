import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';

/*
 * Guards for the rule in docs/DESIGN_SYSTEM.md: styling comes from tokens, never from raw values,
 * and nothing needs an inline style or script (TD-029). Test files and `tokens.css` are skipped.
 */
const sources = import.meta.glob(
  [
    '/src/**/*.{ts,tsx,css}',
    '!/src/**/*.test.{ts,tsx}',
    '!/src/test/**',
    '!/src/tokens.css',
    '!/src/**/*.d.ts',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const files = Object.entries(sources);

describe('design system rules', () => {
  it('scans the source files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('has no hard-coded color outside tokens.css', () => {
    const colorLiteral = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\b/i;

    for (const [path, content] of files) {
      expect(colorLiteral.test(content), `${path} has a raw color`).toBe(false);
    }
  });

  it('has no color function outside tokens.css', () => {
    for (const [path, content] of files) {
      expect(/\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(/i.test(content), path).toBe(false);
    }
  });

  it('has no arbitrary Tailwind value', () => {
    // Matches class names such as `w-[13px]` or `bg-[#fff]`.
    const arbitrary = /(?:^|[\s"'`:])-?[a-z][a-z0-9-]*-\[[^\]\s]+\]/;

    for (const [path, content] of files) {
      expect(arbitrary.test(content), `${path} has an arbitrary value`).toBe(false);
    }
  });

  it('has no numeric duration or delay (use duration-fast, duration-normal, or duration-slow)', () => {
    for (const [path, content] of files) {
      expect(/\b(?:duration|delay)-\d/.test(content), `${path} has a numeric duration`).toBe(false);
    }
  });

  it('has no inline style', () => {
    for (const [path, content] of files) {
      expect(/\bstyle=/.test(content), `${path} has a style attribute`).toBe(false);
      expect(/<style[\s>]/.test(content), `${path} has a style element`).toBe(false);
    }
  });

  it('has no inline script and no external address in the page shell', () => {
    expect(indexHtml).not.toMatch(/<script(?![^>]*\bsrc=)/);
    expect(indexHtml).not.toMatch(/\bstyle=/);
    expect(indexHtml).not.toMatch(/https?:\/\//);
  });
});
