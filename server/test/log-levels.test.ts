import { describe, expect, it } from 'vitest';
import { LOG_LEVELS as CONFIGURED_LEVELS } from '../src/config/environment-schema.js';
import { LOG_LEVELS as LOGGER_LEVELS } from '../src/utils/logger.js';

// The configuration and the logger cannot import each other (layer rules), so each lists the levels.
describe('log levels', () => {
  it('are the same in the configuration and in the logger', () => {
    expect([...CONFIGURED_LEVELS]).toEqual([...LOGGER_LEVELS]);
  });
});
