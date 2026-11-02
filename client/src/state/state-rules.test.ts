import { describe, expect, it } from 'vitest';
import packageText from '../../package.json?raw';

/*
 * Guards for the rule in docs/CLIENT_STATE.md: no server data in slices, no persistence.
 * The rule itself is reviewed by people. These checks catch the common ways of breaking it.
 */
const sources = import.meta.glob(['/src/state/**/*.{ts,tsx}', '!/src/state/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const files = Object.entries(sources);

describe('client state rules', () => {
  it('scans the state files', () => {
    expect(files.length).toBeGreaterThanOrEqual(7);
  });

  it('does not use browser storage or a browser database', () => {
    for (const [path, content] of files) {
      expect(/localStorage|sessionStorage|indexedDB|document\.cookie/.test(content), path).toBe(
        false,
      );
    }
  });

  it('does not talk to the API or cache server data', () => {
    for (const [path, content] of files) {
      expect(/\bfetch\(|XMLHttpRequest|axios|createApi|createAsyncThunk/.test(content), path).toBe(
        false,
      );
      expect(/createEntityAdapter/.test(content), path).toBe(false);
    }
  });

  // M3.4: the store mounts the RTK Query cache, so `store.ts` is the one file that may import the
  // data-access layer. A slice that imports it is on its way to holding server data.
  it('lets only store.ts import the data-access layer', () => {
    for (const [path, content] of files) {
      const importsDataAccess = /@\/data-access/.test(content);

      expect(importsDataAccess, path).toBe(path.endsWith('/store.ts'));
    }
  });

  // The only middleware is the RTK Query one, and nothing else is added to the store.
  it('adds no store enhancer or middleware except the RTK Query middleware', () => {
    for (const [path, content] of files) {
      const withoutCacheMiddleware = content.replace(
        /\.concat\(\s*baseApi\.middleware,?\s*\)/g,
        '',
      );

      expect(/\.concat\(|enhancers:/.test(withoutCacheMiddleware), path).toBe(false);

      if (!path.endsWith('/store.ts')) {
        expect(/middleware:/.test(content), path).toBe(false);
      }
    }
  });

  it('has no persistence package', () => {
    const { dependencies = {}, devDependencies = {} } = JSON.parse(packageText) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const installed = Object.keys({ ...dependencies, ...devDependencies });

    expect(installed.filter((name) => /persist/i.test(name))).toEqual([]);
  });

  it('uses the typed hooks only: no plain React Redux hook is imported outside hooks.ts', () => {
    for (const [path, content] of files) {
      if (path.endsWith('/hooks.ts')) {
        continue;
      }

      expect(/from 'react-redux'/.test(content), path).toBe(false);
    }
  });
});
