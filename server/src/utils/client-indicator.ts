import { createHmac, randomBytes } from 'node:crypto';

/** Turns a client address into a short value that can be logged in its place. */
export type ClientIndicator = (address: string | undefined) => string;

/**
 * Creates the "client indicator" of ARCHITECTURE_DESIGN.md Section 12.4: a way to tell clients
 * apart in the logs (for example, to see that one client triggered a limit five times) without
 * writing their address, because logs stay free of personal data (Section 15.3).
 *
 * The value is a keyed hash cut to 12 hexadecimal characters. The key is random and exists only in
 * memory, so the value cannot be turned back into an address, and the same client has a different
 * indicator after a restart.
 */
export function createClientIndicator(): ClientIndicator {
  const key = randomBytes(32);
  return (address) =>
    createHmac('sha256', key)
      .update(address ?? 'unknown')
      .digest('hex')
      .slice(0, 12);
}
