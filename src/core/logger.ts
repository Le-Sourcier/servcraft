import pino from 'pino';
import type { Logger } from 'pino';

export interface LoggerConfig {
  level: string;
  pretty: boolean;
  name?: string;
}

const defaultConfig: LoggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  pretty: process.env.NODE_ENV !== 'production',
  name: 'servcraft',
};

export function createLogger(config: Partial<LoggerConfig> = {}): Logger {
  const mergedConfig = { ...defaultConfig, ...config };

  const transport = mergedConfig.pretty
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

  return pino({
    name: mergedConfig.name,
    level: mergedConfig.level,
    transport,
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export const logger = createLogger();

export type { Logger };
