/*
 * Resource tag types (ARCHITECTURE_DESIGN.md Section 6.5, TD-007).
 *
 * One tag type per RESOURCE, shared by its public and admin reads. A change to a skill makes both
 * the public skills list and the admin skills list stale, because both carry the `Skill` tag.
 *
 * Tags describe what a cached read CONTAINS. They are never used as a place to keep data.
 */
export const TAG_TYPES = [
  /** The signed-in Admin (`GET /auth/me`). */
  'CurrentUser',
  /** The Admin overview (`GET /admin/dashboard`). Every content change makes it stale. */
  'Dashboard',
  /** The single settings record, public and admin. */
  'Settings',
  'Project',
  'Article',
  'Skill',
  'Experience',
  'Education',
  'Certification',
  'Message',
] as const;

export type TagType = (typeof TAG_TYPES)[number];

/** The id of the tag that stands for "every list of this resource". */
export const LIST_TAG_ID = 'LIST';
