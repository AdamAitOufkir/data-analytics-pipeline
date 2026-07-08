/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const pino = require("pino");

const logFilePath =
  process.env.APP_LOG_FILE || path.join(process.cwd(), "logs", "app.log");

fs.mkdirSync(path.dirname(logFilePath), { recursive: true });

const fileStream = pino.destination({
  dest: logFilePath,
  sync: false,
});

const appLogger = pino(
  {
    base: {
      service: "big-data-app",
      environment: process.env.NODE_ENV || "development",
    },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  },
  pino.multistream([{ stream: process.stdout }, { stream: fileStream }]),
);

function asRecord(value) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value;
  }

  return {};
}

function resolveActivityRoute(metadata, requestRoute) {
  const normalizedMetadata = asRecord(metadata);

  if (typeof normalizedMetadata.page === "string" && normalizedMetadata.page.trim()) {
    return normalizedMetadata.page.trim();
  }

  if (typeof normalizedMetadata.route === "string" && normalizedMetadata.route.trim()) {
    return normalizedMetadata.route.trim();
  }

  if (typeof normalizedMetadata.path === "string" && normalizedMetadata.path.trim()) {
    return normalizedMetadata.path.trim();
  }

  return requestRoute || "/";
}

function serializeError(error) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }

  return {
    errorMessage: typeof error === "string" ? error : String(error),
  };
}

function logActivityEvent({
  activityType,
  userId,
  sessionId,
  metadata = {},
  requestRoute = "/api/track",
  method = "POST",
  responseTimeMs = null,
  userAgent = "",
}) {
  appLogger.info({
    event: "user_activity",
    activityType,
    route: resolveActivityRoute(metadata, requestRoute),
    requestRoute,
    method,
    responseTimeMs,
    userAgent,
    userId,
    sessionId,
    metadata,
  });
}

function logPipelineEvent(details) {
  appLogger.info({
    event: "pipeline_event",
    ...details,
  });
}

function logErrorEvent({
  event,
  route = "/",
  method = "UNKNOWN",
  responseTimeMs = null,
  userAgent = "",
  error,
  metadata = {},
}) {
  appLogger.error({
    event,
    route,
    method,
    responseTimeMs,
    userAgent,
    metadata,
    ...serializeError(error),
  });
}

module.exports = {
  appLogger,
  logActivityEvent,
  logErrorEvent,
  logFilePath,
  logPipelineEvent,
};
