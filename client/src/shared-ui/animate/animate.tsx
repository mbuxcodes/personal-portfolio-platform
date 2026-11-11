import type { ReactNode } from 'react';
import { domAnimation, LazyMotion, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import {
  ANIMATION_DURATION,
  EASE_STANDARD,
  MAX_STAGGER_STEPS,
  STAGGER_STEP_SECONDS,
} from './animation-config';

/**
 * The approved animation patterns (TD-010). This is the whole set. Anything else needs a change
 * to this file, so the site stays restrained ("professional over flashy").
 *
 * - `fade`:  appears by opacity only. For page and section transitions.
 * - `rise`:  appears by opacity and a short upward move. For list reveals and notifications.
 * - `scale`: appears by opacity and a slight grow. For dialogs.
 */
export type AnimationPattern = 'fade' | 'rise' | 'scale';

const patterns = {
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  rise: { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } },
  scale: { initial: { opacity: 0, scale: 0.97 }, animate: { opacity: 1, scale: 1 } },
} as const;

const motionElements = { div: m.div, li: m.li, section: m.section } as const;

export interface AnimateProps {
  pattern: AnimationPattern;
  children: ReactNode;
  /** The element to render. Use `li` inside a list. */
  as?: keyof typeof motionElements;
  /** The position in a list. Later items start a little later, up to a small limit. */
  index?: number;
  className?: string;
}

/**
 * The one place animation is applied (TD-010, ARCHITECTURE_DESIGN.md Section 6.7).
 *
 * When the visitor asks for reduced motion, nothing is animated: the content is drawn in its
 * final state at once (FR-A11Y-008). Content never depends on the animation to be understood.
 * The animation runs once, when the element first appears.
 */
export function Animate({ pattern, children, as = 'div', index = 0, className }: AnimateProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const Plain = as;

    return <Plain className={className}>{children}</Plain>;
  }

  const MotionElement = motionElements[as];
  const { initial, animate } = patterns[pattern];

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionElement
        className={className}
        initial={initial}
        animate={animate}
        transition={{
          duration: ANIMATION_DURATION.normal,
          ease: EASE_STANDARD,
          delay: Math.min(index, MAX_STAGGER_STEPS) * STAGGER_STEP_SECONDS,
        }}
      >
        {children}
      </MotionElement>
    </LazyMotion>
  );
}
