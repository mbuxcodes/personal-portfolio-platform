import { describe, expect, it } from 'vitest';
import { createClientIndicator } from '#utils/client-indicator';

describe('client indicator', () => {
  it('gives the same client the same short indicator', () => {
    const indicate = createClientIndicator();

    expect(indicate('203.0.113.9')).toBe(indicate('203.0.113.9'));
    expect(indicate('203.0.113.9')).toMatch(/^[0-9a-f]{12}$/);
  });

  it('tells different clients apart', () => {
    const indicate = createClientIndicator();

    expect(indicate('203.0.113.9')).not.toBe(indicate('203.0.113.10'));
  });

  it('never contains the address it stands for', () => {
    expect(createClientIndicator()('203.0.113.9')).not.toContain('203');
  });

  it('cannot be compared between processes, because the key is random', () => {
    expect(createClientIndicator()('203.0.113.9')).not.toBe(createClientIndicator()('203.0.113.9'));
  });

  it('handles a missing address', () => {
    expect(createClientIndicator()(undefined)).toMatch(/^[0-9a-f]{12}$/);
  });
});
