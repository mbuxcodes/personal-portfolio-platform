import { describe, expect, it } from 'vitest';
import { createJsonLogger, describeError } from '#utils/logger';

describe('createJsonLogger', () => {
  const fixedTime = new Date('2026-10-26T10:00:00.000Z');

  it('writes one line of JSON per entry with level, time, event, and fields', () => {
    const lines: string[] = [];
    const logger = createJsonLogger(
      (line) => lines.push(line),
      {},
      () => fixedTime,
    );

    logger.warn('something_happened', { count: 2 });

    expect(lines).toHaveLength(1);
    expect(lines[0]?.endsWith('\n')).toBe(true);
    expect(JSON.parse(lines[0] as string)).toEqual({
      level: 'warn',
      time: '2026-10-26T10:00:00.000Z',
      event: 'something_happened',
      count: 2,
    });
  });

  it('supports every level', () => {
    const levels: string[] = [];
    const logger = createJsonLogger((line) => levels.push(JSON.parse(line).level));

    logger.info('a');
    logger.warn('b');
    logger.error('c');
    logger.fatal('d');

    expect(levels).toEqual(['info', 'warn', 'error', 'fatal']);
  });

  it('adds the bindings of a child logger to every entry without changing the parent', () => {
    const entries: Record<string, unknown>[] = [];
    const parent = createJsonLogger((line) => entries.push(JSON.parse(line)));
    const child = parent.child({ requestId: 'r-1' });

    child.info('from_child');
    parent.info('from_parent');

    expect(entries[0]).toMatchObject({ event: 'from_child', requestId: 'r-1' });
    expect(entries[1]).not.toHaveProperty('requestId');
  });

  it('never lets supplied fields replace level, time, or event', () => {
    const entries: Record<string, unknown>[] = [];
    const logger = createJsonLogger(
      (line) => entries.push(JSON.parse(line)),
      {},
      () => fixedTime,
    );

    logger.info('real_event', { level: 'fatal', event: 'fake', time: 'never' });

    expect(entries[0]).toMatchObject({
      level: 'info',
      event: 'real_event',
      time: '2026-10-26T10:00:00.000Z',
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
