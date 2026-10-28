import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InvalidConfigurationError, loadConfig } from '#config/configuration';
import { environmentSchema } from '#config/environment-schema';

// Obviously fake values that satisfy the rules. None is a real credential.
const REQUIRED = {
  NODE_ENV: 'development',
  DATABASE_URL: 'mongodb://localhost:27017/portfolio-test',
  CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: 'test-api-key',
  CLOUDINARY_API_SECRET: 'test-api-secret',
  CLOUDINARY_FOLDER: 'portfolio-test',
  ACCESS_TOKEN_SECRET: 'test-access-secret-0123456789abcdef',
  REFRESH_TOKEN_SECRET: 'test-refresh-secret-fedcba9876543210',
  SITE_URL: 'https://portfolio.test',
};

afterEach(() => {
  vi.unstubAllEnvs();
});

function failureOf(env: Record<string, string | undefined>): InvalidConfigurationError {
  try {
    loadConfig(env);
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidConfigurationError);
    return error as InvalidConfigurationError;
  }
  throw new Error('Expected loadConfig to throw');
}

function withoutVariable(name: string): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...REQUIRED };
  delete env[name];
  return env;
}

describe('valid configuration', () => {
  it('loads when only the required variables are set, applying the documented defaults', () => {
    expect(loadConfig(REQUIRED)).toEqual({
      runtime: {
        environment: 'development',
        port: 5000,
        trustProxyHops: 0,
        shutdownTimeoutMs: 10_000,
      },
      database: { url: 'mongodb://localhost:27017/portfolio-test' },
      media: {
        cloudName: 'test-cloud',
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
        folder: 'portfolio-test',
      },
      session: {
        accessTokenSecret: 'test-access-secret-0123456789abcdef',
        refreshTokenSecret: 'test-refresh-secret-fedcba9876543210',
        accessTokenTtlSeconds: 15 * 60,
        inactivityLimitSeconds: 2 * 60 * 60,
        maxLifetimeSeconds: 24 * 60 * 60,
      },
      limits: {
        pageSizes: { projects: 12, articles: 10, admin: 20, publicMaximum: 50, adminMaximum: 100 },
        uploadMaxBytes: 5 * 1024 * 1024,
        duplicateMessageWindowSeconds: 60,
      },
      rateLimits: {
        publicRead: { max: 120, windowSeconds: 60 },
        contact: { max: 5, windowSeconds: 3600 },
        signIn: { max: 10, windowSeconds: 900 },
        renewal: { max: 20, windowSeconds: 900 },
        admin: { max: 120, windowSeconds: 60 },
        upload: { max: 20, windowSeconds: 600 },
      },
      site: { url: 'https://portfolio.test' },
    });
  });

  it('reads every setting from the environment when it is set', () => {
    const config = loadConfig({
      ...REQUIRED,
      NODE_ENV: 'production',
      PORT: '8080',
      SHUTDOWN_TIMEOUT_SECONDS: '30',
      TRUST_PROXY_HOPS: '2',
      DATABASE_URL: 'mongodb+srv://cluster.example.test/portfolio',
      ACCESS_TOKEN_TTL_SECONDS: '300',
      SESSION_INACTIVITY_LIMIT_SECONDS: '600',
      SESSION_MAX_LIFETIME_SECONDS: '1200',
      PAGE_SIZE_PROJECTS_DEFAULT: '6',
      PAGE_SIZE_ARTICLES_DEFAULT: '5',
      PAGE_SIZE_ADMIN_DEFAULT: '15',
      PAGE_SIZE_PUBLIC_MAX: '30',
      PAGE_SIZE_ADMIN_MAX: '60',
      UPLOAD_MAX_BYTES: '1048576',
      DUPLICATE_MESSAGE_WINDOW_SECONDS: '120',
      RATE_LIMIT_PUBLIC_READ_MAX: '1',
      RATE_LIMIT_PUBLIC_READ_WINDOW_SECONDS: '2',
      RATE_LIMIT_CONTACT_MAX: '3',
      RATE_LIMIT_CONTACT_WINDOW_SECONDS: '4',
      RATE_LIMIT_SIGN_IN_MAX: '5',
      RATE_LIMIT_SIGN_IN_WINDOW_SECONDS: '6',
      RATE_LIMIT_RENEWAL_MAX: '7',
      RATE_LIMIT_RENEWAL_WINDOW_SECONDS: '8',
      RATE_LIMIT_ADMIN_MAX: '9',
      RATE_LIMIT_ADMIN_WINDOW_SECONDS: '10',
      RATE_LIMIT_UPLOAD_MAX: '11',
      RATE_LIMIT_UPLOAD_WINDOW_SECONDS: '12',
      SITE_URL: 'http://localhost:5173',
    });

    expect(config.runtime).toEqual({
      environment: 'production',
      port: 8080,
      trustProxyHops: 2,
      shutdownTimeoutMs: 30_000,
    });
    expect(config.database.url).toBe('mongodb+srv://cluster.example.test/portfolio');
    expect(config.session).toMatchObject({
      accessTokenTtlSeconds: 300,
      inactivityLimitSeconds: 600,
      maxLifetimeSeconds: 1200,
    });
    expect(config.limits).toEqual({
      pageSizes: { projects: 6, articles: 5, admin: 15, publicMaximum: 30, adminMaximum: 60 },
      uploadMaxBytes: 1_048_576,
      duplicateMessageWindowSeconds: 120,
    });
    expect(config.rateLimits).toEqual({
      publicRead: { max: 1, windowSeconds: 2 },
      contact: { max: 3, windowSeconds: 4 },
      signIn: { max: 5, windowSeconds: 6 },
      renewal: { max: 7, windowSeconds: 8 },
      admin: { max: 9, windowSeconds: 10 },
      upload: { max: 11, windowSeconds: 12 },
    });
    expect(config.site.url).toBe('http://localhost:5173');
  });

  it('accepts port 0 and the limits of each range', () => {
    expect(loadConfig({ ...REQUIRED, PORT: '0' }).runtime.port).toBe(0);
    expect(loadConfig({ ...REQUIRED, PORT: '65535' }).runtime.port).toBe(65535);
    expect(loadConfig({ ...REQUIRED, TRUST_PROXY_HOPS: '10' }).runtime.trustProxyHops).toBe(10);
    const shortest = loadConfig({ ...REQUIRED, SHUTDOWN_TIMEOUT_SECONDS: '1' });
    expect(shortest.runtime.shutdownTimeoutMs).toBe(1000);
    const longest = loadConfig({ ...REQUIRED, SHUTDOWN_TIMEOUT_SECONDS: '120' });
    expect(longest.runtime.shutdownTimeoutMs).toBe(120_000);
  });

  it('ignores variables it does not know', () => {
    expect(() => loadConfig({ ...REQUIRED, PATH: '/usr/bin', SOMETHING_ELSE: 'x' })).not.toThrow();
  });

  it('treats an empty value as not set', () => {
    expect(loadConfig({ ...REQUIRED, PORT: '' }).runtime.port).toBe(5000);
  });

  it('reads the process environment when no environment is given', () => {
    for (const [name, value] of Object.entries({ ...REQUIRED, PORT: '5055' })) {
      vi.stubEnv(name, value);
    }

    const config = loadConfig();

    expect(config.runtime.port).toBe(5055);
    expect(config.site.url).toBe('https://portfolio.test');
  });

  it('does not change the environment it is given', () => {
    const env = { ...REQUIRED, PORT: '' };

    loadConfig(env);

    expect(env).toEqual({ ...REQUIRED, PORT: '' });
  });
});

describe('missing variables', () => {
  it.each(Object.keys(REQUIRED))('names %s when it is not set', (name) => {
    expect(failureOf(withoutVariable(name)).variables).toEqual([name]);
  });

  it.each(Object.keys(REQUIRED))('names %s when it is empty', (name) => {
    expect(failureOf({ ...REQUIRED, [name]: '' }).variables).toEqual([name]);
  });

  it('names every missing variable at once', () => {
    expect(failureOf({}).variables).toEqual(Object.keys(REQUIRED));
  });

  it('gives no secret a default', () => {
    const secrets = [
      'DATABASE_URL',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'ACCESS_TOKEN_SECRET',
      'REFRESH_TOKEN_SECRET',
    ];

    for (const name of secrets) {
      expect(failureOf(withoutVariable(name)).variables).toContain(name);
    }
  });
});

describe('malformed values', () => {
  it.each([
    ['NODE_ENV', 'staging'],
    ['PORT', 'abc'],
    ['PORT', '65536'],
    ['PORT', '-1'],
    ['PORT', '80.5'],
    ['PORT', '1e3'],
    ['PORT', '0x10'],
    ['PORT', ' 80'],
    ['TRUST_PROXY_HOPS', '11'],
    ['TRUST_PROXY_HOPS', 'true'],
    ['SHUTDOWN_TIMEOUT_SECONDS', '0'],
    ['SHUTDOWN_TIMEOUT_SECONDS', '121'],
    ['DATABASE_URL', 'postgres://localhost/portfolio'],
    ['DATABASE_URL', 'localhost:27017'],
    ['DATABASE_URL', 'mongodb://'],
    ['ACCESS_TOKEN_TTL_SECONDS', '0'],
    ['ACCESS_TOKEN_TTL_SECONDS', '15m'],
    ['SESSION_INACTIVITY_LIMIT_SECONDS', '-5'],
    ['SESSION_MAX_LIFETIME_SECONDS', 'forever'],
    ['PAGE_SIZE_PROJECTS_DEFAULT', '0'],
    ['PAGE_SIZE_PUBLIC_MAX', 'many'],
    ['UPLOAD_MAX_BYTES', '0'],
    ['UPLOAD_MAX_BYTES', '5MB'],
    ['DUPLICATE_MESSAGE_WINDOW_SECONDS', '0'],
    ['RATE_LIMIT_CONTACT_MAX', '0'],
    ['RATE_LIMIT_SIGN_IN_WINDOW_SECONDS', '0'],
    ['RATE_LIMIT_UPLOAD_MAX', 'lots'],
    ['SITE_URL', 'portfolio.test'],
    ['SITE_URL', 'ftp://portfolio.test'],
  ])('names %s when it is %s', (name, value) => {
    expect(failureOf({ ...REQUIRED, [name]: value }).variables).toEqual([name]);
  });

  it('names every malformed variable at once, in a fixed order', () => {
    const failure = failureOf({ ...REQUIRED, SITE_URL: 'nope', PORT: 'abc', NODE_ENV: 'staging' });

    expect(failure.variables).toEqual(['NODE_ENV', 'PORT', 'SITE_URL']);
  });
});

describe('secrets', () => {
  it.each(['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET'])('rejects a short %s', (name) => {
    expect(failureOf({ ...REQUIRED, [name]: 'x7Kp-9vLq-2mZw' }).variables).toEqual([name]);
  });

  it.each(['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET'])(
    'rejects a long but repetitive %s',
    (name) => {
      const repetitive = 'abababababababababababababababababababab';

      expect(failureOf({ ...REQUIRED, [name]: repetitive }).variables).toEqual([name]);
    },
  );

  it('accepts a secret of exactly the minimum length', () => {
    const secret = '0123456789abcdefghijklmnopqrstuv';

    expect(secret).toHaveLength(32);
    expect(() => loadConfig({ ...REQUIRED, ACCESS_TOKEN_SECRET: secret })).not.toThrow();
  });

  it('accepts a generated 64-character secret', () => {
    const generated = 'b4f1c9e07a3d58266e0fa1d3c7b95e482d6a07f3c1e9b5840a7d2f6c8e13b95a';

    expect(() => loadConfig({ ...REQUIRED, REFRESH_TOKEN_SECRET: generated })).not.toThrow();
  });

  it('requires different access and renewal secrets, naming both', () => {
    const same = 'shared-secret-0123456789abcdefghijklmnop';

    const failure = failureOf({
      ...REQUIRED,
      ACCESS_TOKEN_SECRET: same,
      REFRESH_TOKEN_SECRET: same,
    });

    expect(failure.variables).toEqual(['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET']);
  });
});

describe('values that must agree with each other', () => {
  it('rejects an access lifetime longer than the inactivity limit', () => {
    const env = { ...REQUIRED, ACCESS_TOKEN_TTL_SECONDS: '7201' };

    expect(failureOf(env).variables).toEqual([
      'ACCESS_TOKEN_TTL_SECONDS',
      'SESSION_INACTIVITY_LIMIT_SECONDS',
    ]);
  });

  it('rejects an inactivity limit longer than the maximum session', () => {
    const env = { ...REQUIRED, SESSION_INACTIVITY_LIMIT_SECONDS: '86401' };

    expect(failureOf(env).variables).toEqual([
      'SESSION_INACTIVITY_LIMIT_SECONDS',
      'SESSION_MAX_LIFETIME_SECONDS',
    ]);
  });

  it.each([
    ['PAGE_SIZE_PROJECTS_DEFAULT', 'PAGE_SIZE_PUBLIC_MAX', '51'],
    ['PAGE_SIZE_ARTICLES_DEFAULT', 'PAGE_SIZE_PUBLIC_MAX', '51'],
    ['PAGE_SIZE_ADMIN_DEFAULT', 'PAGE_SIZE_ADMIN_MAX', '101'],
  ])('rejects %s above %s', (defaultName, maximumName, value) => {
    expect(failureOf({ ...REQUIRED, [defaultName]: value }).variables).toEqual([
      defaultName,
      maximumName,
    ]);
  });

  it('accepts values that are equal', () => {
    expect(() =>
      loadConfig({
        ...REQUIRED,
        ACCESS_TOKEN_TTL_SECONDS: '600',
        SESSION_INACTIVITY_LIMIT_SECONDS: '600',
        SESSION_MAX_LIFETIME_SECONDS: '600',
      }),
    ).not.toThrow();
  });
});

describe('failure messages', () => {
  const SENTINELS = {
    DATABASE_URL: 'postgres://admin:SENTINEL-db-password@host/db',
    CLOUDINARY_API_SECRET: '',
    ACCESS_TOKEN_SECRET: 'SENTINEL-weak',
    REFRESH_TOKEN_SECRET: 'SENTINEL-also-weak',
    PORT: 'SENTINEL-port',
    SITE_URL: 'SENTINEL-site',
  };

  it('never expose a value in the message, the fields, or the serialized error', () => {
    const failure = failureOf({ ...REQUIRED, ...SENTINELS });

    const everything = [
      failure.message,
      String(failure),
      failure.stack ?? '',
      JSON.stringify(failure),
      JSON.stringify(failure.variables),
      JSON.stringify(Object.getOwnPropertyNames(failure)),
    ].join('\n');
    expect(everything).not.toContain('SENTINEL');
    expect(everything).not.toContain('postgres://');
    expect(failure.variables).toEqual([
      'PORT',
      'DATABASE_URL',
      'CLOUDINARY_API_SECRET',
      'ACCESS_TOKEN_SECRET',
      'REFRESH_TOKEN_SECRET',
      'SITE_URL',
    ]);
  });

  it('do not expose a secret that is valid but duplicated', () => {
    const duplicated = 'SENTINEL-duplicate-0123456789abcdefghijklmn';

    const failure = failureOf({
      ...REQUIRED,
      ACCESS_TOKEN_SECRET: duplicated,
      REFRESH_TOKEN_SECRET: duplicated,
    });

    const everything = `${failure.message}${JSON.stringify(failure)}${failure.stack ?? ''}`;
    expect(everything).not.toContain('SENTINEL');
  });

  it('carry no reference to the validator or to the rejected input', () => {
    const failure = failureOf({ ...REQUIRED, ACCESS_TOKEN_SECRET: 'SENTINEL-weak' });

    expect(failure.cause).toBeUndefined();
    expect(JSON.parse(JSON.stringify(failure))).toEqual({
      name: 'InvalidConfigurationError',
      variables: ['ACCESS_TOKEN_SECRET'],
    });
  });

  it('name the variables in the message', () => {
    expect(failureOf({ PORT: 'x' }).message).toContain('PORT');
  });
});

describe('exported configuration', () => {
  it('is frozen at every level', () => {
    const config = loadConfig(REQUIRED);

    for (const part of [
      config,
      config.runtime,
      config.database,
      config.media,
      config.session,
      config.limits,
      config.limits.pageSizes,
      config.rateLimits,
      config.rateLimits.publicRead,
      config.rateLimits.upload,
      config.site,
    ]) {
      expect(Object.isFrozen(part)).toBe(true);
    }
  });

  it('cannot be changed, added to, or removed from', () => {
    const config = loadConfig(REQUIRED) as unknown as Record<string, Record<string, unknown>>;

    expect(() => {
      config.runtime.port = 1;
    }).toThrow(TypeError);
    expect(() => {
      config.session.accessTokenSecret = 'replaced';
    }).toThrow(TypeError);
    expect(() => {
      config.extra = {};
    }).toThrow(TypeError);
    expect(() => {
      delete config.site;
    }).toThrow(TypeError);
  });

  it('is built from a new object on each load, never shared between loads', () => {
    expect(loadConfig(REQUIRED)).not.toBe(loadConfig(REQUIRED));
  });
});

describe('environment template', () => {
  const template = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8');
  const assignments = template.split('\n').filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line));

  it('lists every variable the server reads, and no other', () => {
    const names = assignments.map((line) => line.slice(0, line.indexOf('=')));

    expect(names).toEqual(Object.keys(environmentSchema.shape));
  });

  it('holds names only, never a value', () => {
    for (const line of assignments) {
      expect(line.endsWith('=')).toBe(true);
    }
  });
});
