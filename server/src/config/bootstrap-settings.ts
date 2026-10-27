export interface BootstrapSettings {
  port: number;
  /** How many proxy steps in front of the server are trusted to report the client address (TD-027). */
  trustProxyHops: number;
  /** How long in-flight requests may take to finish during shutdown (TD-047). */
  shutdownTimeoutMs: number;
}

/** Thrown when settings are invalid. It carries variable names only, never values. */
export class InvalidSettingsError extends Error {
  readonly variables: readonly string[];

  constructor(variables: readonly string[]) {
    super(`Invalid configuration: ${variables.join(', ')}`);
    this.name = 'InvalidSettingsError';
    this.variables = variables;
  }
}

type Environment = Readonly<Record<string, string | undefined>>;

interface IntegerRule {
  name: string;
  fallback: number;
  min: number;
  max: number;
}

/**
 * Reads the few settings the server process needs to start and stop.
 * The full validated configuration layer (Milestone 2.2) replaces this.
 */
export function readBootstrapSettings(env: Environment): BootstrapSettings {
  const invalid: string[] = [];

  const readInteger = ({ name, fallback, min, max }: IntegerRule): number => {
    const raw = env[name];
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || value < min || value > max) {
      invalid.push(name);
      return fallback;
    }
    return value;
  };

  const settings: BootstrapSettings = {
    port: readInteger({ name: 'PORT', fallback: 5000, min: 0, max: 65535 }),
    trustProxyHops: readInteger({ name: 'TRUST_PROXY_HOPS', fallback: 0, min: 0, max: 10 }),
    shutdownTimeoutMs:
      readInteger({ name: 'SHUTDOWN_TIMEOUT_SECONDS', fallback: 10, min: 1, max: 120 }) * 1000,
  };

  if (invalid.length > 0) throw new InvalidSettingsError(invalid);
  return settings;
}
