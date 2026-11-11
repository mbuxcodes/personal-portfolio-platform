import { useState, type ComponentPropsWithoutRef } from 'react';
import { classNames } from '@/utils/class-names';

/**
 * An image is either described or declared decorative. There is no third option, and the type
 * enforces it: `alt` must be a text, or `decorative` must be `true`. Never both.
 */
type ImageAccessibility =
  { alt: string; decorative?: false } | { decorative: true; alt?: undefined };

export type ImageProps = ImageAccessibility &
  Omit<ComponentPropsWithoutRef<'img'>, 'alt' | 'src' | 'children'> & {
    src: string;
    /** Text shown when the image cannot load. Defaults to "Image unavailable". */
    fallbackText?: string;
  };

type LoadStatus = 'loading' | 'loaded' | 'failed';

/**
 * The only way to show an image (FR-A11Y-005).
 *
 * - A text alternative is required, or the image must be declared `decorative`, in which case it
 *   is hidden from screen readers. The type checks this when the code is written. If the rule is
 *   still broken at run time (for example, a blank text from stored content), the image is not
 *   drawn at all, because an image without a text alternative is worse than no image. In
 *   development and tests it throws, so the mistake is found early.
 * - While it loads, a muted block holds its place, and the image fades in when ready.
 * - If it fails, a labelled block replaces it, so the page keeps its shape and its meaning.
 * - It never grows past its container. Pass `width` and `height` to reserve its space, and
 *   `srcSet` and `sizes` for responsive files. It loads lazily unless told otherwise. `className`
 *   styles the block around the image.
 */
export function Image(props: ImageProps) {
  const {
    src,
    alt,
    decorative,
    fallbackText = 'Image unavailable',
    className,
    loading = 'lazy',
    onLoad,
    onError,
    ...imgProps
  } = props;
  const [status, setStatus] = useState<LoadStatus>('loading');
  const hasTextAlternative = alt !== undefined && alt.trim() !== '';

  if (!decorative && !hasTextAlternative) {
    if (import.meta.env.DEV) {
      throw new Error('Image needs a text alternative (alt), or decorative={true}.');
    }

    return null;
  }

  if (status === 'failed') {
    return decorative ? (
      <div aria-hidden="true" className={classNames('bg-surface-muted', className)} />
    ) : (
      <div
        role="img"
        aria-label={alt}
        className={classNames(
          'flex items-center justify-center bg-surface-muted p-4 text-body-sm text-text-secondary',
          className,
        )}
      >
        <span aria-hidden="true">{fallbackText}</span>
      </div>
    );
  }

  return (
    <div className={classNames('max-w-full overflow-hidden bg-surface-muted', className)}>
      <img
        src={src}
        alt={decorative ? '' : alt}
        loading={loading}
        decoding="async"
        className={classNames(
          'block h-auto max-w-full transition-opacity duration-normal ease-standard',
          status === 'loaded' ? 'opacity-100' : 'opacity-0',
        )}
        onLoad={(event) => {
          setStatus('loaded');
          onLoad?.(event);
        }}
        onError={(event) => {
          setStatus('failed');
          onError?.(event);
        }}
        {...imgProps}
      />
    </div>
  );
}
