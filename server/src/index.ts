import express from 'express';

const app = express();

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
import { InvalidSettingsError, readBootstrapSettings } from '#config/bootstrap-settings';
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

let settings;
try {
  settings = readBootstrapSettings(process.env);
} catch (error) {
  if (!(error instanceof InvalidSettingsError)) throw error;
  logger.fatal('invalid_configuration', { variables: error.variables });
  exit(1);
}

if (settings) {
  const hooks = createHookRegistry(logger);

  // Later milestones register their startup and shutdown hooks on `hooks` before the start.
  await startServer({ settings, hooks, logger, process, exit });
}
