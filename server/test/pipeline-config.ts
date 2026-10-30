import type { PipelineConfig } from '../src/middleware/pipeline.js';

/**
 * A pipeline configuration for tests. The limits are generous, so a test that is not about limits
 * never reaches one, and the body limits are small, so tests send tiny bodies. A test about a limit
 * overrides exactly that limit.
 */
export function createTestPipelineConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  const generous = { max: 1000, windowSeconds: 60 };
  return {
    environment: 'test',
    siteUrl: 'https://portfolio.example',
    mediaCloudName: 'demo-cloud',
    rateLimits: {
      publicRead: generous,
      contact: generous,
      signIn: generous,
      renewal: generous,
      admin: generous,
      upload: generous,
    },
    bodyLimits: { jsonBytes: 1024, multipartBytes: 2048 },
    ...overrides,
  };
}
