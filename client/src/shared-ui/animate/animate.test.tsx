import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import tokens from '@/tokens.css?raw';
import { setScreen } from '@/test/viewport';
import { ANIMATION_DURATION } from './animation-config';
import { Animate } from './animate';

/*
 * Motion draws its starting state as an inline style when it animates, for example `opacity: 0`.
 * Content that is drawn plainly has no such style, which is how these tests tell the two apart.
 */
describe('Animate', () => {
  it('starts the content from its hidden state when motion is allowed', () => {
    setScreen({ reducedMotion: false });
    render(<Animate pattern="fade">Hello</Animate>);

    expect(screen.getByText('Hello').style.opacity).toBe('0');
  });

  it('draws the content plainly, with no animation, when reduced motion is requested', () => {
    setScreen({ reducedMotion: true });
    render(<Animate pattern="rise">Hello</Animate>);

    const element = screen.getByText('Hello');

    expect(element.getAttribute('style')).toBeNull();
    expect(element.style.opacity).toBe('');
    expect(element.style.transform).toBe('');
  });

  it.each(['fade', 'rise', 'scale'] as const)(
    'drops the %s pattern entirely under reduced motion',
    (pattern) => {
      setScreen({ reducedMotion: true });
      render(<Animate pattern={pattern}>Content</Animate>);

      expect(screen.getByText('Content').getAttribute('style')).toBeNull();
    },
  );

  it('keeps the content, its element type and its class under reduced motion', () => {
    setScreen({ reducedMotion: true });
    render(
      <ul>
        <Animate as="li" pattern="rise" className="rounded-md">
          Item
        </Animate>
      </ul>,
    );

    const item = screen.getByRole('listitem');

    expect(item).toHaveTextContent('Item');
    expect(item).toHaveClass('rounded-md');
  });

  it('keeps the content, its element type and its class when motion is allowed', () => {
    setScreen({ reducedMotion: false });
    render(
      <ul>
        <Animate as="li" pattern="scale" className="rounded-md">
          Item
        </Animate>
      </ul>,
    );

    expect(screen.getByRole('listitem')).toHaveClass('rounded-md');
  });
});

describe('animation durations', () => {
  it('match the duration tokens in tokens.css, so they cannot drift', () => {
    const fromTokens = (name: string) =>
      Number(new RegExp(`--transition-duration-${name}:\\s*(\\d+)ms`).exec(tokens)?.[1]) / 1000;

    expect(ANIMATION_DURATION.fast).toBe(fromTokens('fast'));
    expect(ANIMATION_DURATION.normal).toBe(fromTokens('normal'));
    expect(ANIMATION_DURATION.slow).toBe(fromTokens('slow'));
  });
});
