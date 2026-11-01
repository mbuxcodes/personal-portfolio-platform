# Design System

How the client is styled, and how to keep it consistent. This note belongs to milestone M3.2. The decisions behind it are TD-005 (Tailwind v4), TD-044 (fonts), and TD-029 (content security policy).

## 1. The rule

**Every color, size, space, radius, and duration comes from a token. No raw value appears anywhere else.**

Why hardcoded values are forbidden:

- **Consistency (BR-015).** A value typed once in a component is a value that drifts. Tokens give one source of truth.
- **Accessibility.** Each text and background pair is measured once, in this document and in a test. A raw color skips that check.
- **Cheap change.** Dark mode and theme work (deferred, `SCOPE.md` Section 6) become a second set of values for the same token names, not a rewrite of every component.
- **Strict content security policy (TD-029).** Inline styles are blocked. Everything is a class from the one stylesheet.

A test (`client/src/design-system-rules.test.ts`) fails the build when source code contains a raw color, a color function, an arbitrary Tailwind value such as `w-[13px]`, a numeric duration such as `duration-150`, or an inline `style` attribute.

## 2. Where things live

| File                               | What it holds                                                      |
| ---------------------------------- | ------------------------------------------------------------------ |
| `client/src/index.css`             | The one stylesheet. Imports the files below, in order              |
| `client/src/fonts.css`             | `@font-face` rules for the self-hosted fonts                       |
| `client/src/tokens.css`            | **All tokens.** The only file that may contain a raw value         |
| `client/src/base.css`              | Page defaults, focus style, reduced-motion rule. Tokens only       |
| `client/src/tokens.test.ts`        | Contrast checks for every color pair, and the token checklist      |
| `client/public/licenses/fonts.txt` | Font copyright notices and the license text, served from this site |

There is no `tailwind.config.js`. Tailwind v4 is configured in CSS, through `@theme` in `tokens.css`.

## 3. Using tokens

Tokens are named by **role**, never by appearance: `surface`, not `white`. Use them through Tailwind utilities.

| Need         | Utilities                                                                                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Background   | `bg-surface`, `bg-surface-muted`, `bg-surface-inverse`, `bg-accent`, `bg-accent-hover`, `bg-danger`, `bg-success`                                                                                              |
| Text color   | `text-text-primary`, `text-text-secondary`, `text-text-inverse`, `text-text-inverse-secondary`, `text-text-on-accent`, `text-text-on-status`, `text-accent-text`, `text-accent`, `text-danger`, `text-success` |
| Borders      | `border-border` (decorative), `border-border-strong` (form controls)                                                                                                                                           |
| Font family  | `font-body`, `font-heading`, `font-code`                                                                                                                                                                       |
| Heading size | `text-heading-1` to `text-heading-4` (size, line height, and weight together)                                                                                                                                  |
| Body size    | `text-body-lg`, `text-body`, `text-body-sm`, `text-caption`                                                                                                                                                    |
| Weight       | `font-regular`, `font-medium`, `font-semibold`, `font-bold`                                                                                                                                                    |
| Line height  | `leading-tight`, `leading-snug`, `leading-normal`, `leading-relaxed`                                                                                                                                           |
| Spacing      | Steps `0 1 2 3 4 5 6 8 10 12 16 20 24 32` (4px grid): `p-4`, `gap-6`, `mt-12`, `w-8`, `size-12`                                                                                                                |
| Radii        | `rounded-sm`, `rounded-md`, `rounded-lg`                                                                                                                                                                       |
| Breakpoints  | `mobile` (base, no prefix needed), `tablet:` (48rem), `desktop:` (64rem). Write mobile styles first                                                                                                            |
| Motion       | `duration-fast` (120ms), `duration-normal` (240ms), `duration-slow` (400ms), `ease-standard`                                                                                                                   |

Tailwind's own palette and scales are cleared, so `text-blue-500`, `p-7`, `text-lg`, and `rounded-xl` do not exist. If a class is missing, the design has no such token. Do not reach for a raw value.

To see every token rendered, run the client in development and open `/dev/tokens`. The page exists only in development and is not in the production build.

### Rules for components

1. Style with token utilities only. Never add `style=`, a raw color, or an arbitrary value `[...]`.
2. Pick colors by role and by pair. Put `text-text-primary` on `bg-surface`, and so on, using only the pairs in Section 4. A pair that is not listed has not been checked.
3. Build mobile first. Add `tablet:` and `desktop:` only for what changes.
4. Write class names in full (`bg-danger`, not `bg-${kind}`). Tailwind reads the source as text and creates only the classes it can see.
5. Never remove the focus outline. Focus is handled in `base.css` for every element. A component that sits on the inverse surface sets `data-surface="inverse"` on that surface, so the ring uses the light color there.
6. Animate only with the motion tokens. The reduced-motion rule in `base.css` cuts all animation and transitions to one instant frame, and content must never depend on them (FR-A11Y-008).
7. When the same utility combination repeats, make it a shared component in `shared-ui/` (M3.5). Do not copy it.

### Adding or changing a token

1. Change `tokens.css` only. Name it by role.
2. For a color, add every pair it is used in to `tokens.test.ts`. The test fails if a color is in no pair and is not listed as decorative.
3. Update the table in Section 4 and the page `features/dev/design-tokens`.

## 4. Contrast record

WCAG 2.2 AA: 4.5:1 for text (1.4.3), 3:1 for control edges and focus indicators (1.4.11). Ratios are computed from the token values with the WCAG formula, and re-checked on every test run by `tokens.test.ts`.

| Foreground               | Background        | Values             | Ratio   | Needs |
| ------------------------ | ----------------- | ------------------ | ------- | ----- |
| `text-primary`           | `surface`         | #0f172a on #ffffff | 17.85:1 | 4.5:1 |
| `text-primary`           | `surface-muted`   | #0f172a on #f1f5f9 | 16.30:1 | 4.5:1 |
| `text-primary`           | `accent`          | #0f172a on #d4af37 | 8.49:1  | 4.5:1 |
| `text-primary`           | `accent-hover`    | #0f172a on #e0c25a | 10.23:1 | 4.5:1 |
| `text-secondary`         | `surface`         | #475569 on #ffffff | 7.58:1  | 4.5:1 |
| `text-secondary`         | `surface-muted`   | #475569 on #f1f5f9 | 6.92:1  | 4.5:1 |
| `text-inverse`           | `surface-inverse` | #f8fafc on #0f172a | 17.06:1 | 4.5:1 |
| `text-inverse-secondary` | `surface-inverse` | #cbd5e1 on #0f172a | 12.02:1 | 4.5:1 |
| `text-on-accent`         | `accent`          | #0f172a on #d4af37 | 8.49:1  | 4.5:1 |
| `text-on-accent`         | `accent-hover`    | #0f172a on #e0c25a | 10.23:1 | 4.5:1 |
| `text-on-status`         | `danger`          | #ffffff on #b91c1c | 6.47:1  | 4.5:1 |
| `text-on-status`         | `success`         | #ffffff on #15803d | 5.02:1  | 4.5:1 |
| `accent`                 | `surface-inverse` | #d4af37 on #0f172a | 8.49:1  | 4.5:1 |
| `accent-text`            | `surface`         | #7a5c00 on #ffffff | 6.25:1  | 4.5:1 |
| `accent-text`            | `surface-muted`   | #7a5c00 on #f1f5f9 | 5.71:1  | 4.5:1 |
| `danger`                 | `surface`         | #b91c1c on #ffffff | 6.47:1  | 4.5:1 |
| `danger`                 | `surface-muted`   | #b91c1c on #f1f5f9 | 5.91:1  | 4.5:1 |
| `success`                | `surface`         | #15803d on #ffffff | 5.02:1  | 4.5:1 |
| `success`                | `surface-muted`   | #15803d on #f1f5f9 | 4.58:1  | 4.5:1 |
| `border-strong`          | `surface`         | #64748b on #ffffff | 4.76:1  | 3:1   |
| `border-strong`          | `surface-muted`   | #64748b on #f1f5f9 | 4.34:1  | 3:1   |
| `focus-ring`             | `surface`         | #0f172a on #ffffff | 17.85:1 | 3:1   |
| `focus-ring`             | `surface-muted`   | #0f172a on #f1f5f9 | 16.30:1 | 3:1   |
| `focus-ring`             | `accent`          | #0f172a on #d4af37 | 8.49:1  | 3:1   |
| `focus-ring-inverse`     | `surface-inverse` | #d4af37 on #0f172a | 8.49:1  | 3:1   |

Not text, so no minimum applies: `border` (#e2e8f0, 1.23:1 on `surface`) draws decorative dividers only. Anything that marks the edge of a control uses `border-strong`.

### The brand colors

The brand primary is #0f172a (`surface-inverse`, and the dark text color) and the brand accent is #d4af37 (`accent`). The accent on a white background measures only 2.10:1, so **it must never be text or a meaningful icon on a light surface.** Use it as a fill with `text-on-accent`, or as text on `surface-inverse`. For an accent-colored link or label on a light surface, use `accent-text` (a darker shade of the same gold, 6.25:1). The brand rule of no gradients holds: a test fails if a gradient appears in the stylesheets.

### Focus

Focus is shown by `:focus-visible` with a 3px outline and a 2px gap, so it appears for keyboard use and not for mouse clicks. The gap means the ring is read against the surface behind the element. On `surface`, `surface-muted`, and `accent` the ring is `focus-ring` (navy). On `surface-inverse` it is `focus-ring-inverse` (gold). The token page has a button on each background for a visual check.

## 5. Fonts

Two families, both variable fonts, served from this site only (TD-044). The build copies the files into the site's own assets and no request goes to another site. Only the Latin subset is loaded. Other characters use the system fallbacks.

| Role              | Family         | Source package                        | Weights | Fallbacks                                                   |
| ----------------- | -------------- | ------------------------------------- | ------- | ----------------------------------------------------------- |
| Headings and body | Inter          | `@fontsource-variable/inter`          | 100-900 | system UI sans-serif (`system-ui`, Segoe UI, Roboto, Arial) |
| Code              | JetBrains Mono | `@fontsource-variable/jetbrains-mono` | 100-800 | system monospace (`ui-monospace`, Menlo, Consolas)          |

Only the weights 400, 500, 600, and 700 are used.

### Licenses

| Family         | Copyright                               | License                         | Self-hosting |
| -------------- | --------------------------------------- | ------------------------------- | ------------ |
| Inter          | 2016 The Inter Project Authors          | SIL Open Font License 1.1 (OFL) | Allowed      |
| JetBrains Mono | 2020 The JetBrains Mono Project Authors | SIL Open Font License 1.1 (OFL) | Allowed      |

The OFL allows use, embedding, and redistribution of the fonts, including on a website, as long as they are not sold on their own and the copyright notice and license text accompany them. The fonts are unmodified. The notices and the license text are in `client/public/licenses/fonts.txt`, which the site serves at `/licenses/fonts.txt`. Both packages record the license as `OFL-1.1`.

## 6. Browser support

Tailwind v4 depends on Chrome 111, Safari 16.4, and Firefox 128 (Tailwind's compatibility guide). TD-045 supports the current and previous major versions of the main browsers, which are all well above those minimums, so the two statements agree.

## 7. Content security policy

The stylesheet is a single file. Fonts and any asset come from this site: the build never turns an asset into a `data:` address (`assetsInlineLimit` is 0), because the policy allows `self` only. The page shell has no inline script or style. The development server adds inline styles for hot reload, which is the recorded exception E-1 in `server/src/middleware/security-headers.ts` and does not apply to production.
