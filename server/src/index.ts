import { InvalidConfigurationError, loadConfig, type Config } from '#config/configuration';
import { createHookRegistry } from '#lifecycle/hook-registry';
import { createJsonLogger } from '#utils/logger';
import { startServer } from './start-server.js';

// The process entry. This is the only file with side effects at import time.

const logger = createJsonLogger((line) => process.stdout.write(line));

// Leave only after everything logged so far has been written.
const exit = (code: number): void => {
  process.exitCode = code;
  process.stdout.write('', () => process.exit(code));
};

let config: Config | undefined;
try {
  config = loadConfig();
} catch (error) {
  if (!(error instanceof InvalidConfigurationError)) throw error;
  logger.fatal('invalid_configuration', { variables: error.variables });
  exit(1);
}

if (config) {
  const hooks = createHookRegistry(logger);

  // Later milestones register their startup and shutdown hooks on `hooks` before the start,
  // using the validated `config`.
  await startServer({ runtime: config.runtime, hooks, logger, process, exit });
}
