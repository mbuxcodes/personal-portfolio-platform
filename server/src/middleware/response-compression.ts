import compression from 'compression';
import type { RequestHandler } from 'express';

/** Responses smaller than this are sent as they are, since compressing them saves almost nothing. */
export const COMPRESSION_THRESHOLD_BYTES = 1024;

/**
 * Response compression (ARCHITECTURE_DESIGN.md Section 17.2: "Responses are compressed in transit").
 *
 * It is not a numbered step of Section 7.3, because it changes only how a response is sent. It sits
 * directly after the security headers, so that every later response is compressed, including the
 * refusals of the steps after it. The library compresses only types that benefit, such as JSON and
 * text, only when the client asks for it, and adds `Vary: Accept-Encoding`.
 */
export function createResponseCompression(): RequestHandler {
  return compression({ threshold: COMPRESSION_THRESHOLD_BYTES });
}
