import { request as httpRequest, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';

export interface RawResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  text: string;
  json: () => unknown;
}

/**
 * Sends a request exactly as described, with the body in the chunks given. No header is added
 * except the ones Node adds itself, so a test can send a body with no content type, or a body with
 * no declared length (which Node sends as chunked).
 */
export async function sendRaw(
  app: Express,
  options: { method: string; path: string; headers?: Record<string, string>; chunks?: string[] },
): Promise<RawResponse> {
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  try {
    return await new Promise<RawResponse>((resolve, reject) => {
      const outgoing = httpRequest(
        {
          host: '127.0.0.1',
          port,
          method: options.method,
          path: options.path,
          headers: options.headers,
        },
        (incoming) => {
          const parts: Buffer[] = [];
          incoming.on('data', (part: Buffer) => parts.push(part));
          incoming.on('end', () => {
            const text = Buffer.concat(parts).toString('utf8');
            resolve({
              status: incoming.statusCode ?? 0,
              headers: incoming.headers,
              text,
              json: () => JSON.parse(text) as unknown,
            });
          });
        },
      );
      outgoing.on('error', reject);
      for (const chunk of options.chunks ?? []) outgoing.write(chunk);
      outgoing.end();
    });
  } finally {
    server.closeAllConnections();
    server.close();
  }
}
