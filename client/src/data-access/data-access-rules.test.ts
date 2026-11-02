import { describe, expect, it } from 'vitest';
import { baseApi } from './api/base-api';

/*
 * Guards for the rules of the data-access layer (ARCHITECTURE_DESIGN.md Section 6.1 and 6.5,
 * TD-007, TD-049). The rules are reviewed by people. These checks catch the common ways of
 * breaking them while the layer still has no feature in it.
 */
const sources = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const files = Object.entries(sources);
const inLayer = (path: string) => path.startsWith('/src/data-access/');

describe('data-access rules', () => {
  it('scans the source files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('gives the shared API no endpoints of its own', () => {
    expect(Object.keys(baseApi.endpoints)).toEqual([]);
  });

  it('has no feature endpoint inside the layer: features inject their own', () => {
    for (const [path, content] of files.filter(([file]) => inLayer(file))) {
      expect(/injectEndpoints|builder\.(query|mutation|infiniteQuery)/.test(content), path).toBe(
        // Only the documentation example in base-api.ts mentions them.
        path.endsWith('/api/base-api.ts') || path.endsWith('/tags/tag-helpers.ts'),
      );
    }
  });

  // The invalidation convention: every write declares what it makes stale.
  it('declares `invalidatesTags` for every mutation, in every file', () => {
    for (const [path, content] of files) {
      const code = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      const mutations = code.match(/builder\.mutation\b/g)?.length ?? 0;
      const declarations = code.match(/invalidatesTags\s*:/g)?.length ?? 0;

      expect(declarations, `${path}: every mutation needs invalidatesTags`).toBeGreaterThanOrEqual(
        mutations,
      );
    }
  });

  it('keeps fixtures and the mock server out of the production code', () => {
    for (const [path, content] of files) {
      if (
        path.startsWith('/src/data-access/fixtures/') ||
        path.startsWith('/src/data-access/mocks/')
      ) {
        continue;
      }

      expect(
        /data-access\/(fixtures|mocks)|from '\.\/(fixtures|mocks)'|msw/.test(content),
        path,
      ).toBe(false);
    }
  });

  it('never imports the store: the store hands over what the layer needs', () => {
    for (const [path, content] of files.filter(([file]) => inLayer(file))) {
      expect(/@\/state|from '\.\.\/\.\.\/state/.test(content), path).toBe(false);
    }
  });
});
