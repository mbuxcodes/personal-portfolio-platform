import { secretValuesOf, type Config } from '#config/configuration';
import { createLogger, type Logger, type LogWriter } from '#utils/logger';

export interface ConfigureLoggingOptions {
  config: Config;
  /** Where JSON entries go. In production this is standard output. */
  write: LogWriter;
  /** Replaceable so tests do not depend on the development-only package being installed. */
  loadReadableWriter?: () => Promise<LogWriter>;
}

/**
 * Builds the logger from the validated configuration: the configured level, the secrets removed
 * from every entry, and JSON output. Only in development, readable output replaces the JSON, so
 * production always writes JSON (TD-028). If the readable output cannot be loaded, JSON is used.
 */
export async function configureLogging({
  config,
  write,
  loadReadableWriter = loadPinoPretty,
}: ConfigureLoggingOptions): Promise<Logger> {
  const { environment, logLevel } = config.runtime;

  let destination = write;
  let readableOutputFailed = false;
  if (environment === 'development') {
    try {
      destination = await loadReadableWriter();
    } catch {
      readableOutputFailed = true;
    }
  }

  const logger = createLogger({
    write: destination,
    level: logLevel,
    secrets: secretValuesOf(config),
  });
  if (readableOutputFailed) logger.warn('readable_logging_unavailable');
  return logger;
}

/** `pino-pretty` is a development dependency, so it is loaded only when it is asked for. */
async function loadPinoPretty(): Promise<LogWriter> {
  const { default: pretty } = await import('pino-pretty');
  const stream = pretty({ sync: true, messageKey: 'event', translateTime: 'SYS:HH:MM:ss.l' });
  return (line) => {
    stream.write(line);
  };
}
