import { createApp, type AppOptions } from '../src/app.js';
import type { PipelineConfig } from '../src/middleware/pipeline.js';
import { createTestPipelineConfig } from './pipeline-config.js';
import { createMemoryLogger } from './memory-logger.js';

export interface PipelineAppOptions {
  /** Overrides of the test pipeline configuration. */
  config?: Partial<PipelineConfig>;
  trustProxyHops?: number;
  registerRoutes?: AppOptions['registerRoutes'];
}

/** An application with the full pipeline, a memory logger, and the test-only routes the test adds. */
export function createPipelineApp(options: PipelineAppOptions = {}) {
  const memory = createMemoryLogger();
  const app = createApp({
    logger: memory.logger,
    trustProxyHops: options.trustProxyHops ?? 0,
    pipeline: createTestPipelineConfig(options.config),
    registerRoutes: options.registerRoutes,
  });
  return { app, ...memory };
}
