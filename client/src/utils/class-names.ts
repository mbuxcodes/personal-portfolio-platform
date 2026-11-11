type ClassPart = string | false | null | undefined;

/**
 * Joins class names, skipping anything that is not a string.
 * Write each class name out in full: Tailwind reads the source as text (docs/DESIGN_SYSTEM.md).
 */
export function classNames(...parts: ClassPart[]): string {
  return parts.filter(Boolean).join(' ');
}
