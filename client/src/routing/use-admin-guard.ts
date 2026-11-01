export interface AdminGuardResult {
  /** Whether the visitor may see the guarded admin pages. */
  isAllowed: boolean;
}

/**
 * Placeholder for the admin session guard.
 *
 * It always allows access, because no session exists yet. Milestone 5.5 replaces the body:
 * visitors without a session are sent to sign-in and return to the intended page afterward
 * (FR-AUTH-006). The server's guard (M5.3) remains the real protection.
 * This hook only decides what the client shows.
 */
export function useAdminGuard(): AdminGuardResult {
  return { isAllowed: true };
}
