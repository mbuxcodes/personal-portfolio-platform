import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Image, type ImageProps } from './image';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Image', () => {
  it('renders the text alternative', () => {
    render(<Image src="/a.png" alt="A dashboard with three charts" />);

    expect(screen.getByRole('img', { name: 'A dashboard with three charts' })).toBeInTheDocument();
  });

  it('hides a decorative image from assistive technology', () => {
    const { container } = render(<Image src="/a.png" decorative />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('does not compile without a text alternative or the decorative flag', () => {
    // @ts-expect-error An image needs `alt`, or `decorative`.
    const missing: ImageProps = { src: '/a.png' };
    // @ts-expect-error `alt` and `decorative` cannot be given together.
    const both: ImageProps = { src: '/a.png', alt: 'x', decorative: true };

    expect([missing, both]).toHaveLength(2);
  });

  it('throws in development when the text alternative is missing or blank', () => {
    const blank = { src: '/a.png', alt: '   ' } as ImageProps;

    expect(import.meta.env.DEV).toBe(true);
    expect(() => render(<Image {...blank} />)).toThrow(/text alternative/);
  });

  it('draws nothing in production when the text alternative is missing or blank', () => {
    vi.stubEnv('DEV', false);
    const blank = { src: '/a.png', alt: '' } as ImageProps;
    const { container } = render(<Image {...blank} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('loads lazily and decodes without blocking, and keeps width and height', () => {
    render(<Image src="/a.png" alt="Shot" width={640} height={360} />);

    const image = screen.getByRole('img', { name: 'Shot' });

    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(image).toHaveAttribute('width', '640');
  });

  it('supports responsive sources and never grows past its container', () => {
    render(
      <Image src="/a.png" alt="Shot" srcSet="/a-480.png 480w, /a-960.png 960w" sizes="100vw" />,
    );

    const image = screen.getByRole('img', { name: 'Shot' });

    expect(image).toHaveAttribute('srcset', '/a-480.png 480w, /a-960.png 960w');
    expect(image.className).toContain('max-w-full');
  });

  it('is hidden while loading and shown when loaded', () => {
    render(<Image src="/a.png" alt="Shot" />);
    const image = screen.getByRole('img', { name: 'Shot' });

    expect(image.className).toContain('opacity-0');

    fireEvent.load(image);

    expect(image.className).toContain('opacity-100');
  });

  it('shows a labelled fallback when the file fails, so the meaning is kept', () => {
    render(
      <Image src="/missing.png" alt="A project screenshot" fallbackText="Screenshot missing" />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'A project screenshot' }));

    const fallback = screen.getByRole('img', { name: 'A project screenshot' });

    expect(fallback.tagName).toBe('DIV');
    expect(fallback).toHaveTextContent('Screenshot missing');
  });

  it('shows a silent fallback for a decorative image that fails', () => {
    const { container } = render(<Image src="/missing.png" decorative />);

    fireEvent.error(container.querySelector('img')!);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('calls the load and error handlers it was given', () => {
    const onLoad = vi.fn();
    const onError = vi.fn();
    const { container, rerender } = render(<Image src="/a.png" alt="Shot" onLoad={onLoad} />);

    fireEvent.load(container.querySelector('img')!);
    rerender(<Image src="/b.png" alt="Shot" onError={onError} />);
    fireEvent.error(container.querySelector('img')!);

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('has no detectable violations, loaded or failed', async () => {
    const { container } = render(
      <>
        <Image src="/a.png" alt="Shot" />
        <Image src="/b.png" decorative />
        <Image src="/c.png" alt="Broken" />
      </>,
    );

    fireEvent.error(screen.getByRole('img', { name: 'Broken' }));

    expect((await axe(container)).violations).toEqual([]);
  });
});
