import { createRequire } from "node:module";

export type ActivityLogInput = {
  activityType: string;
  userId: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
  requestRoute?: string;
  method?: string;
  responseTimeMs?: number | null;
  userAgent?: string;
};

export type ErrorLogInput = {
  event: string;
  route?: string;
  method?: string;
  responseTimeMs?: number | null;
  userAgent?: string;
  error: unknown;
  metadata?: Record<string, unknown>;
};

const require = createRequire(import.meta.url);
const logger = require("./logger.cjs") as {
  appLogger: {
    info: (payload: Record<string, unknown>) => void;
    warn: (payload: Record<string, unknown>) => void;
    error: (payload: Record<string, unknown>) => void;
  };
  logActivityEvent: (input: ActivityLogInput) => void;
  logPipelineEvent: (details: Record<string, unknown>) => void;
  logErrorEvent: (input: ErrorLogInput) => void;
  logFilePath: string;
};

export const appLogger = logger.appLogger;
export const logActivityEvent = logger.logActivityEvent;
export const logPipelineEvent = logger.logPipelineEvent;
export const logErrorEvent = logger.logErrorEvent;
export const logFilePath = logger.logFilePath;
