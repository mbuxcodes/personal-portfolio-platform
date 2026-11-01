import { useState } from 'react';
import { formatPageTitle } from '@/utils/format-page-title';

/*
 * Development-only reference for the design tokens (M3.2). It is registered only when the client
 * runs in development (see `routing/dev-routes.ts`), so it is not part of the production build.
 *
 * Every class name below is written out in full. Tailwind finds classes by reading the source as
 * text, so a name built from pieces would produce no style. Values come from tokens only.
 */

const colorTokens = [
  { name: 'surface', swatch: 'bg-surface', role: 'Page background' },
  { name: 'surface-muted', swatch: 'bg-surface-muted', role: 'Cards and quiet bands' },
  { name: 'surface-inverse', swatch: 'bg-surface-inverse', role: 'Dark bands (brand primary)' },
  { name: 'text-primary', swatch: 'bg-text-primary', role: 'Body text and headings' },
  { name: 'text-secondary', swatch: 'bg-text-secondary', role: 'Supporting text' },
  { name: 'text-inverse', swatch: 'bg-text-inverse', role: 'Text on the inverse surface' },
  {
    name: 'text-inverse-secondary',
    swatch: 'bg-text-inverse-secondary',
    role: 'Supporting text on the inverse surface',
  },
  { name: 'text-on-accent', swatch: 'bg-text-on-accent', role: 'Text on an accent fill' },
  { name: 'text-on-status', swatch: 'bg-text-on-status', role: 'Text on a danger or success fill' },
  { name: 'accent', swatch: 'bg-accent', role: 'Brand gold fill' },
  { name: 'accent-hover', swatch: 'bg-accent-hover', role: 'Accent fill under the pointer' },
  { name: 'accent-text', swatch: 'bg-accent-text', role: 'Accent used as text on light surfaces' },
  { name: 'danger', swatch: 'bg-danger', role: 'Errors and destructive actions' },
  { name: 'success', swatch: 'bg-success', role: 'Confirmations' },
  { name: 'border', swatch: 'bg-border', role: 'Decorative dividers' },
  { name: 'border-strong', swatch: 'bg-border-strong', role: 'Edges of form controls' },
  { name: 'focus-ring', swatch: 'bg-focus-ring', role: 'Focus outline on light surfaces' },
  {
    name: 'focus-ring-inverse',
    swatch: 'bg-focus-ring-inverse',
    role: 'Focus outline on the inverse surface',
  },
] as const;

const textPairs = [
  { label: 'text-primary on surface', classes: 'bg-surface text-text-primary' },
  { label: 'text-primary on surface-muted', classes: 'bg-surface-muted text-text-primary' },
  { label: 'text-secondary on surface', classes: 'bg-surface text-text-secondary' },
  { label: 'text-secondary on surface-muted', classes: 'bg-surface-muted text-text-secondary' },
  { label: 'text-inverse on surface-inverse', classes: 'bg-surface-inverse text-text-inverse' },
  {
    label: 'text-inverse-secondary on surface-inverse',
    classes: 'bg-surface-inverse text-text-inverse-secondary',
  },
  { label: 'accent on surface-inverse', classes: 'bg-surface-inverse text-accent' },
  { label: 'text-on-accent on accent', classes: 'bg-accent text-text-on-accent' },
  { label: 'text-on-accent on accent-hover', classes: 'bg-accent-hover text-text-on-accent' },
  { label: 'accent-text on surface', classes: 'bg-surface text-accent-text' },
  { label: 'accent-text on surface-muted', classes: 'bg-surface-muted text-accent-text' },
  { label: 'danger on surface', classes: 'bg-surface text-danger' },
  { label: 'success on surface', classes: 'bg-surface text-success' },
  { label: 'text-on-status on danger', classes: 'bg-danger text-text-on-status' },
  { label: 'text-on-status on success', classes: 'bg-success text-text-on-status' },
] as const;

const headingSizes = [
  { name: 'text-heading-1', classes: 'text-heading-1 font-heading' },
  { name: 'text-heading-2', classes: 'text-heading-2 font-heading' },
  { name: 'text-heading-3', classes: 'text-heading-3 font-heading' },
  { name: 'text-heading-4', classes: 'text-heading-4 font-heading' },
] as const;

const bodySizes = [
  { name: 'text-body-lg', classes: 'text-body-lg' },
  { name: 'text-body', classes: 'text-body' },
  { name: 'text-body-sm', classes: 'text-body-sm' },
  { name: 'text-caption', classes: 'text-caption' },
] as const;

const fontFamilies = [
  { name: 'font-body', classes: 'font-body' },
  { name: 'font-heading', classes: 'font-heading' },
  { name: 'font-code', classes: 'font-code' },
] as const;

const fontWeights = [
  { name: 'font-regular', classes: 'font-regular' },
  { name: 'font-medium', classes: 'font-medium' },
  { name: 'font-semibold', classes: 'font-semibold' },
  { name: 'font-bold', classes: 'font-bold' },
] as const;

const lineHeights = [
  { name: 'leading-tight', classes: 'leading-tight' },
  { name: 'leading-snug', classes: 'leading-snug' },
  { name: 'leading-normal', classes: 'leading-normal' },
  { name: 'leading-relaxed', classes: 'leading-relaxed' },
] as const;

const spacingSteps = [
  { name: '1', classes: 'w-1' },
  { name: '2', classes: 'w-2' },
  { name: '3', classes: 'w-3' },
  { name: '4', classes: 'w-4' },
  { name: '5', classes: 'w-5' },
  { name: '6', classes: 'w-6' },
  { name: '8', classes: 'w-8' },
  { name: '10', classes: 'w-10' },
  { name: '12', classes: 'w-12' },
  { name: '16', classes: 'w-16' },
  { name: '20', classes: 'w-20' },
  { name: '24', classes: 'w-24' },
  { name: '32', classes: 'w-32' },
] as const;

const radii = [
  { name: 'rounded-sm', classes: 'rounded-sm' },
  { name: 'rounded-md', classes: 'rounded-md' },
  { name: 'rounded-lg', classes: 'rounded-lg' },
] as const;

const sample = 'The quick brown fox jumps over the lazy dog.';

const cardClasses = 'rounded-md border border-border bg-surface p-4';
const sectionHeadingClasses = 'mb-4 mt-12';
const labelClasses = 'font-code text-caption text-text-secondary';

export function DesignTokensPage() {
  const [motionOn, setMotionOn] = useState(false);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 tablet:px-8 desktop:py-12">
      <title>{formatPageTitle('Design tokens', 'Development')}</title>
      <h1>Design tokens</h1>
      <p className="mt-2 max-w-prose text-text-secondary">
        Development reference. This page is not part of the production site. Use the token names
        shown here in components, and never a raw value.
      </p>

      <h2 className={sectionHeadingClasses}>Breakpoints</h2>
      <div className={cardClasses}>
        <p className="block tablet:hidden">
          Current layout: <strong>mobile</strong> (base, below 48rem)
        </p>
        <p className="hidden tablet:block desktop:hidden">
          Current layout: <strong>tablet</strong> (from 48rem)
        </p>
        <p className="hidden desktop:block">
          Current layout: <strong>desktop</strong> (from 64rem)
        </p>
      </div>

      <h2 className={sectionHeadingClasses}>Colors</h2>
      <ul className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        {colorTokens.map((token) => (
          <li key={token.name} className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className={`${token.swatch} size-12 shrink-0 rounded-md border border-border-strong`}
            />
            <span>
              <span className="block font-code text-body-sm">{token.name}</span>
              <span className="block text-body-sm text-text-secondary">{token.role}</span>
            </span>
          </li>
        ))}
      </ul>

      <h3 className="mb-4 mt-8">Text on its background</h3>
      <ul className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        {textPairs.map((pair) => (
          <li
            key={pair.label}
            className={`${pair.classes} rounded-md border border-border-strong p-4`}
          >
            <span className="block text-body font-semibold">Aa The quick brown fox</span>
            <span className="block font-code text-caption">{pair.label}</span>
          </li>
        ))}
      </ul>

      <h2 className={sectionHeadingClasses}>Typography</h2>
      <h3 className="mb-4">Heading scale</h3>
      <div className="flex flex-col gap-4">
        {headingSizes.map((size) => (
          <div key={size.name} className={cardClasses}>
            <p className={labelClasses}>{size.name}</p>
            <p className={size.classes}>{sample}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-4 mt-8">Body sizes</h3>
      <div className="flex flex-col gap-4">
        {bodySizes.map((size) => (
          <div key={size.name} className={cardClasses}>
            <p className={labelClasses}>{size.name}</p>
            <p className={size.classes}>{sample}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-4 mt-8">Families, weights, and line heights</h3>
      <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        {fontFamilies.map((family) => (
          <div key={family.name} className={cardClasses}>
            <p className={labelClasses}>{family.name}</p>
            <p className={family.classes}>{sample}</p>
          </div>
        ))}
        {fontWeights.map((weight) => (
          <div key={weight.name} className={cardClasses}>
            <p className={labelClasses}>{weight.name}</p>
            <p className={weight.classes}>{sample}</p>
          </div>
        ))}
        {lineHeights.map((height) => (
          <div key={height.name} className={cardClasses}>
            <p className={labelClasses}>{height.name}</p>
            <p className={`${height.classes} text-body-sm`}>
              {sample} {sample}
            </p>
          </div>
        ))}
      </div>

      <h2 className={sectionHeadingClasses}>Spacing</h2>
      <ul className="flex flex-col gap-2">
        {spacingSteps.map((step) => (
          <li key={step.name} className="flex items-center gap-4">
            <span className="w-24 font-code text-body-sm">spacing-{step.name}</span>
            <span aria-hidden="true" className={`${step.classes} h-4 rounded-sm bg-accent`} />
          </li>
        ))}
      </ul>

      <h2 className={sectionHeadingClasses}>Radii</h2>
      <ul className="flex flex-wrap gap-4">
        {radii.map((radius) => (
          <li key={radius.name} className="flex flex-col items-center gap-2">
            <span
              aria-hidden="true"
              className={`${radius.classes} size-24 border border-border-strong bg-surface-muted`}
            />
            <span className="font-code text-body-sm">{radius.name}</span>
          </li>
        ))}
      </ul>

      <h2 className={sectionHeadingClasses}>Motion</h2>
      <p className="mb-4 max-w-prose text-text-secondary">
        Each bar fades with its own duration. With reduced motion requested, all three change at
        once.
      </p>
      <button
        type="button"
        aria-pressed={motionOn}
        onClick={() => setMotionOn((value) => !value)}
        className="mb-4 rounded-md bg-accent px-4 py-2 font-medium text-text-on-accent transition-colors duration-fast hover:bg-accent-hover"
      >
        Toggle motion
      </button>
      <ul className="flex flex-col gap-2">
        <li className="flex items-center gap-4">
          <span className="w-40 font-code text-body-sm">duration-fast</span>
          <span
            aria-hidden="true"
            className={`h-4 w-32 rounded-sm bg-surface-inverse transition-opacity duration-fast ${motionOn ? 'opacity-100' : 'opacity-20'}`}
          />
        </li>
        <li className="flex items-center gap-4">
          <span className="w-40 font-code text-body-sm">duration-normal</span>
          <span
            aria-hidden="true"
            className={`h-4 w-32 rounded-sm bg-surface-inverse transition-opacity duration-normal ${motionOn ? 'opacity-100' : 'opacity-20'}`}
          />
        </li>
        <li className="flex items-center gap-4">
          <span className="w-40 font-code text-body-sm">duration-slow</span>
          <span
            aria-hidden="true"
            className={`h-4 w-32 rounded-sm bg-surface-inverse transition-opacity duration-slow ${motionOn ? 'opacity-100' : 'opacity-20'}`}
          />
        </li>
      </ul>

      <h2 className={sectionHeadingClasses}>Focus</h2>
      <p className="mb-4 max-w-prose text-text-secondary">
        Press Tab to move through the buttons. The ring must be clearly visible on every background.
      </p>
      <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
        <div className="rounded-md bg-surface p-4">
          <button
            type="button"
            className="rounded-md border border-border-strong px-4 py-2 font-medium"
          >
            On surface
          </button>
        </div>
        <div className="rounded-md bg-surface-muted p-4">
          <button
            type="button"
            className="rounded-md border border-border-strong bg-surface px-4 py-2 font-medium"
          >
            On surface-muted
          </button>
        </div>
        <div data-surface="inverse" className="rounded-md bg-surface-inverse p-4">
          <button
            type="button"
            className="rounded-md border border-text-inverse-secondary px-4 py-2 font-medium text-text-inverse"
          >
            On surface-inverse
          </button>
        </div>
        <div className="rounded-md bg-accent p-4">
          <button
            type="button"
            className="rounded-md bg-surface-inverse px-4 py-2 font-medium text-text-inverse"
          >
            On accent
          </button>
        </div>
      </div>
    </main>
  );
}
