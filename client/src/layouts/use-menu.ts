import { useEffect, useRef, useState, type RefObject } from 'react';
import { useLocation } from 'react-router';

export interface MenuState {
  isOpen: boolean;
  toggle: () => void;
  /** Attach to the button that opens the menu. Escape returns focus to it. */
  buttonRef: RefObject<HTMLButtonElement | null>;
}

/**
 * The open or closed state of the navigation menu on small screens.
 *
 * - The menu closes by itself when the address changes. The state holds the address it was
 *   opened at, so no effect is needed to reset it.
 * - Escape closes an open menu and returns focus to its button (FR-A11Y-002).
 *
 * On wide screens the menu is always shown by the layout's styles, whatever this state says.
 */
export function useMenu(): MenuState {
  const { pathname } = useLocation();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isOpen = openedAt === pathname;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenedAt(null);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', closeOnEscape);

    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  return { isOpen, toggle: () => setOpenedAt(isOpen ? null : pathname), buttonRef };
}
