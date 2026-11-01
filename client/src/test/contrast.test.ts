import { describe, expect, it } from 'vitest';
import { contrastRatio, readColorTokens, relativeLuminance } from './contrast';

describe('contrast helpers', () => {
  it('gives the extremes for black and white', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('does not depend on the order of the colors', () => {
    expect(contrastRatio('#0f172a', '#ffffff')).toBe(contrastRatio('#ffffff', '#0f172a'));
  });

  it('gives 1 for identical colors', () => {
    expect(contrastRatio('#d4af37', '#d4af37')).toBe(1);
  });

  it('matches a published reference ratio', () => {
    // #767676 on white is the well-known smallest gray that passes AA for text (4.54:1).
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('reads color tokens and ignores other variables', () => {
    const css = '--color-surface: #FFFFFF;\n--color-text-primary:#0f172a;\n--spacing-4: 1rem;';

    expect(readColorTokens(css)).toEqual({ surface: '#ffffff', 'text-primary': '#0f172a' });
  });
});
