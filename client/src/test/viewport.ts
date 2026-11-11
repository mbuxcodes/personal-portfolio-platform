import { afterEach, vi } from 'vitest';

/*
 * Test helpers for the browser settings that jsdom does not provide: the screen width and the
 * reduced-motion preference. jsdom does not run a layout engine, so a width changes what
 * `matchMedia` reports and what `window.innerWidth` says, and nothing else. Tests use it for the
 * code that asks, and check the responsive classes of the layouts directly.
 *
 * Like a real browser, a media query list that was already handed out is updated when the
 * setting changes, and its `change` listeners are called. The animation library reads the
 * reduced-motion setting once and then follows these events, so the helper has to send them.
 */

/** The three widths the layouts are tested at (docs/DESIGN_SYSTEM.md breakpoints). */
export const VIEWPORTS = {
  phone: 375,
  tablet: 768,
  desktop: 1280,
} as const;

interface Settings {
  width: number;
  reducedMotion: boolean;
}

type ChangeListener = (event: MediaQueryListEvent) => void;

interface TrackedQuery {
  query: string;
  list: { matches: boolean };
  listeners: Set<ChangeListener>;
}

const tracked: TrackedQuery[] = [];

function evaluate(query: string, settings: Settings): boolean {
  if (query.includes('prefers-reduced-motion')) {
    // A bare `(prefers-reduced-motion)` is true when the person asked for less motion.
    return query.includes('no-preference') ? !settings.reducedMotion : settings.reducedMotion;
  }

  const min = /min-width:\s*([\d.]+)(px|rem)/.exec(query);
  const max = /max-width:\s*([\d.]+)(px|rem)/.exec(query);
  const toPixels = (match: RegExpExecArray) => Number(match[1]) * (match[2] === 'rem' ? 16 : 1);

  return (!min || settings.width >= toPixels(min)) && (!max || settings.width <= toPixels(max));
}

/** Makes `matchMedia` and `innerWidth` report the given screen. Restored after each test. */
export function setScreen({
  width = VIEWPORTS.desktop,
  reducedMotion = false,
}: Partial<Settings> = {}): void {
  const settings = { width, reducedMotion };

  window.innerWidth = width;

  for (const entry of tracked) {
    const matches = evaluate(entry.query, settings);

    if (matches !== entry.list.matches) {
      entry.list.matches = matches;
      entry.listeners.forEach((listener) =>
        listener({ matches, media: entry.query } as MediaQueryListEvent),
      );
    }
  }

  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => {
    const listeners = new Set<ChangeListener>();
    const list = {
      matches: evaluate(query, settings),
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: ChangeListener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: ChangeListener) => listeners.delete(listener),
      addListener: (listener: ChangeListener) => listeners.add(listener),
      removeListener: (listener: ChangeListener) => listeners.delete(listener),
      dispatchEvent: () => false,
    };

    tracked.push({ query, list, listeners });

    return list as unknown as MediaQueryList;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});
