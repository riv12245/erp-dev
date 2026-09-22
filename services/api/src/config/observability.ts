import { AppConfig } from './index.js';
import { createLogger, LogLevel, Logger } from '../platform/observability/logger.js';

export interface ObservabilityConfig {
  readonly logger: Logger;
}

export function getObservability(config: AppConfig): ObservabilityConfig {
  return {
    logger: createLogger('erp-api', config.logLevel as LogLevel),
  };
}