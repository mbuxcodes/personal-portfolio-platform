/*
 * Authentication shapes. Source: API_DESIGN.md Section 5.
 */

/** The signed-in Admin (AUTH-01 and AUTH-04). Never includes password data (Section 5.4). */
export interface AuthUser {
  id: string;
  email: string;
}

/** AUTH-01 request body. */
export interface LoginInput {
  email: string;
  password: string;
}

/** AUTH-01 success: `200`, an item. Credentials travel in cookies, never in the body (Section 5). */
export interface LoginResult {
  user: AuthUser;
}

/** AUTH-05 request body. `204` on success, with no body. */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
