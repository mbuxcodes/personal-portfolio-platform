import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '#config/configuration';
import { configureLogging } from './configure-logging.js';

const ENVIRONMENT = {
  NODE_ENV: 'production',
  DATABASE_URL: 'mongodb://admin:DB_PASSWORD_CANARY@localhost:27017/portfolio-test',
  CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: 'test-api-key-CANARY',
  CLOUDINARY_API_SECRET: 'test-api-secret-CANARY',
  CLOUDINARY_FOLDER: 'portfolio-test',
  ACCESS_TOKEN_SECRET: 'test-access-secret-CANARY-0123456789abcdef',
  REFRESH_TOKEN_SECRET: 'test-refresh-secret-CANARY-fedcba9876543210',
  SITE_URL: 'https://portfolio.test',
};

const configFor = (overrides: Record<string, string> = {}) =>
  loadConfig({ ...ENVIRONMENT, ...overrides });

function setup() {
  const lines: string[] = [];
  const readableLines: string[] = [];
  const write = (line: string): void => void lines.push(line);
  const loadReadableWriter = vi.fn(() =>
    Promise.resolve((line: string): void => void readableLines.push(line)),
  );
  return { lines, readableLines, write, loadReadableWriter };
}

describe('configureLogging', () => {
  it('writes JSON to the given destination in production, without loading readable output', async () => {
    const { lines, write, loadReadableWriter } = setup();

    const logger = await configureLogging({ config: configFor(), write, loadReadableWriter });
    logger.info('probe');

    expect(loadReadableWriter).not.toHaveBeenCalled();
    expect(JSON.parse(lines[0] as string)).toMatchObject({ level: 'info', event: 'probe' });
  });

  it('writes JSON in the test environment too', async () => {
    const { lines, write, loadReadableWriter } = setup();

    const logger = await configureLogging({
      config: configFor({ NODE_ENV: 'test' }),
      write,
      loadReadableWriter,
    });
    logger.info('probe');

    expect(loadReadableWriter).not.toHaveBeenCalled();
    expect(lines).toHaveLength(1);
  });

  it('uses readable output, and not the JSON destination, only in development', async () => {
    const { lines, readableLines, write, loadReadableWriter } = setup();

    const logger = await configureLogging({
      config: configFor({ NODE_ENV: 'development' }),
      write,
      loadReadableWriter,
    });
    logger.info('probe');

    expect(loadReadableWriter).toHaveBeenCalledTimes(1);
    expect(readableLines).toHaveLength(1);
    expect(lines).toHaveLength(0);
  });

  it('falls back to JSON, and says so, when readable output cannot be loaded', async () => {
    const { lines, write } = setup();
    const loadReadableWriter = vi.fn(() => Promise.reject(new Error('not installed')));

    const logger = await configureLogging({
      config: configFor({ NODE_ENV: 'development' }),
      write,
      loadReadableWriter,
    });
    logger.info('probe');

    const events = lines.map((line) => JSON.parse(line).event);
    expect(events).toEqual(['readable_logging_unavailable', 'probe']);
  });

  it('applies the configured level', async () => {
    const { lines, write } = setup();

    const logger = await configureLogging({ config: configFor({ LOG_LEVEL: 'warn' }), write });
    logger.info('hidden');
    logger.warn('shown');

    expect(lines.map((line) => JSON.parse(line).event)).toEqual(['shown']);
  });

  it('writes info and above by default, and debug when asked', async () => {
    const quiet = setup();
    const loud = setup();

    const defaultLogger = await configureLogging({ config: configFor(), write: quiet.write });
    const debugLogger = await configureLogging({
      config: configFor({ LOG_LEVEL: 'debug' }),
      write: loud.write,
    });
    defaultLogger.debug('probe');
    debugLogger.debug('probe');

    expect(quiet.lines).toHaveLength(0);
    expect(loud.lines).toHaveLength(1);
  });

  it('removes every configured secret from anything it writes', async () => {
    const { lines, write } = setup();

    const logger = await configureLogging({ config: configFor(), write });
    logger.error('failure', {
      error: {
        message: [
          'mongodb://admin:DB_PASSWORD_CANARY@localhost:27017/portfolio-test',
          'test-api-key-CANARY',
          'test-api-secret-CANARY',
          'test-access-secret-CANARY-0123456789abcdef',
          'test-refresh-secret-CANARY-fedcba9876543210',
        ].join(' | '),
      },
    });

    expect(lines.join('')).toContain('failure');
    expect(lines.join('')).not.toContain('CANARY');
    expect(lines.join('')).not.toContain('mongodb://');
  });
});
