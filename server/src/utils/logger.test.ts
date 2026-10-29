import { describe, expect, it } from 'vitest';
import { createLogger, describeError, LOG_LEVELS, type LogLevel } from '#utils/logger';

const fixedTime = new Date('2026-10-27T10:00:00.000Z');

function capture(options: { level?: LogLevel; secrets?: readonly string[] } = {}) {
  const lines: string[] = [];
  const logger = createLogger({
    write: (line) => lines.push(line),
    now: () => fixedTime,
    ...options,
  });
  const entries = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  return { logger, lines, entries };
}

describe('createLogger', () => {
  it('writes one line of JSON per entry with level, time, event, and fields', () => {
    const { logger, lines, entries } = capture();

    logger.warn('something_happened', { count: 2 });

    expect(lines).toHaveLength(1);
    expect(lines[0]?.endsWith('\n')).toBe(true);
    expect(entries()[0]).toEqual({
      level: 'warn',
      time: '2026-10-27T10:00:00.000Z',
      event: 'something_happened',
      count: 2,
    });
  });

  it('writes the level as a name, not a number', () => {
    const { logger, entries } = capture({ level: 'debug' });

    for (const level of LOG_LEVELS) logger[level]('probe');

    expect(entries().map((entry) => entry.level)).toEqual([
      'fatal',
      'error',
      'warn',
      'info',
      'debug',
    ]);
  });

  it('writes no process or host details', () => {
    const { logger, entries } = capture();

    logger.info('probe');

    expect(Object.keys(entries()[0] ?? {}).sort()).toEqual(['event', 'level', 'time']);
  });

  describe('level', () => {
    it('is info by default, so debug entries are not written', () => {
      const { logger, entries } = capture();

      logger.debug('hidden');
      logger.info('shown');

      expect(entries().map((entry) => entry.event)).toEqual(['shown']);
    });

    it.each([
      ['fatal', ['fatal']],
      ['error', ['fatal', 'error']],
      ['warn', ['fatal', 'error', 'warn']],
      ['info', ['fatal', 'error', 'warn', 'info']],
      ['debug', ['fatal', 'error', 'warn', 'info', 'debug']],
    ] as const)('%s writes it and every more severe level', (level, expected) => {
      const { logger, entries } = capture({ level });

      for (const name of LOG_LEVELS) logger[name]('probe');

      expect(entries().map((entry) => entry.level)).toEqual(expected);
    });
  });

  describe('child loggers', () => {
    it('add their bindings to every entry without changing the parent', () => {
      const { logger, entries } = capture();
      const child = logger.child({ requestId: 'req_1' });

      child.info('from_child');
      logger.info('from_parent');

      expect(entries()[0]).toMatchObject({ event: 'from_child', requestId: 'req_1' });
      expect(entries()[1]).not.toHaveProperty('requestId');
    });

    it('keep the bindings of the loggers they came from', () => {
      const { logger, entries } = capture();

      logger.child({ requestId: 'req_1' }).child({ module: 'projects' }).info('probe');

      expect(entries()[0]).toMatchObject({ requestId: 'req_1', module: 'projects' });
    });

    it('have their bindings redacted', () => {
      const { logger, lines } = capture();

      logger.child({ requestId: 'req_1', authorization: 'AUTH_CANARY' }).info('probe');

      expect(lines.join('')).not.toContain('AUTH_CANARY');
    });
  });

  describe('reserved fields', () => {
    it('can never be replaced or duplicated by supplied fields', () => {
      const { logger, lines, entries } = capture();

      logger.info('real_event', { level: 'fatal', event: 'fake', time: 'never' });

      expect(entries()[0]).toEqual({
        level: 'info',
        time: '2026-10-27T10:00:00.000Z',
        event: 'real_event',
      });
      expect(lines[0]?.match(/"level"/g)).toHaveLength(1);
      expect(lines[0]?.match(/"time"/g)).toHaveLength(1);
      expect(lines[0]?.match(/"event"/g)).toHaveLength(1);
    });

    it('cannot be replaced through the bindings of a child', () => {
      const { logger, entries } = capture();

      logger.child({ level: 'fatal', event: 'fake' }).info('real_event');

      expect(entries()[0]).toMatchObject({ level: 'info', event: 'real_event' });
    });
  });

  describe('redaction', () => {
    it('applies the field rules to every entry', () => {
      const { logger, lines } = capture();

      logger.info('probe', {
        password: 'PASSWORD_CANARY',
        headers: { cookie: 'COOKIE_CANARY', authorization: 'Bearer AUTH_CANARY' },
        user: { accessToken: 'TOKEN_CANARY' },
      });

      expect(lines.join('')).not.toMatch(/CANARY/);
      expect(lines.join('')).toContain('[REDACTED]');
    });

    it('keeps the fields it is not meant to hide', () => {
      const { logger, entries } = capture();

      logger.info('probe', { method: 'GET', status: 200 });

      expect(entries()[0]).toMatchObject({ method: 'GET', status: 200 });
    });

    it('removes configured secret values from any text', () => {
      const { logger, lines } = capture({ secrets: ['SUPER_SECRET_123'] });

      logger.error('failed', { error: describeError(new Error('bad key SUPER_SECRET_123')) });

      expect(lines.join('')).not.toContain('SUPER_SECRET_123');
    });

    it('applies at every level', () => {
      const { logger, lines } = capture({ level: 'debug' });

      for (const level of LOG_LEVELS) logger[level]('probe', { token: 'TOKEN_CANARY' });

      expect(lines).toHaveLength(5);
      expect(lines.join('')).not.toContain('TOKEN_CANARY');
    });
  });
});

describe('describeError', () => {
  it('describes an Error by name, message, and stack', () => {
    const fields = describeError(new TypeError('bad input'));

    expect(fields).toMatchObject({ name: 'TypeError', message: 'bad input' });
    expect(typeof fields.stack).toBe('string');
  });

  it('describes a value that is not an Error', () => {
    expect(describeError('plain text')).toEqual({ name: 'NonError', message: 'plain text' });
  });
});
