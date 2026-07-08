import { NextRequest, NextResponse } from "next/server";
import { appLogger, logActivityEvent, logErrorEvent, logPipelineEvent } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb";
import { EventModel } from "@/models/Event";

export const runtime = "nodejs";

type ValidEvent = {
  event_type: string;
  user_id: string;
  session_id: string;
  metadata: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeEvent(rawEvent: unknown):
  | { ok: true; value: ValidEvent }
  | { ok: false; error: string } {
  if (!isRecord(rawEvent)) {
    return { ok: false, error: "Event payload must be an object." };
  }

  const eventType =
    typeof rawEvent.event_type === "string" ? rawEvent.event_type.trim() : "";
  const userId = typeof rawEvent.user_id === "string" ? rawEvent.user_id.trim() : "";
  const sessionId =
    typeof rawEvent.session_id === "string" ? rawEvent.session_id.trim() : "";

  if (!eventType) {
    return { ok: false, error: "event_type is required." };
  }

  if (!userId) {
    return { ok: false, error: "user_id is required." };
  }

  if (!sessionId) {
    return { ok: false, error: "session_id is required." };
  }

  if (
    rawEvent.metadata !== undefined &&
    !isRecord(rawEvent.metadata)
  ) {
    return { ok: false, error: "metadata must be an object." };
  }

  return {
    ok: true,
    value: {
      event_type: eventType,
      user_id: userId,
      session_id: sessionId,
      metadata: isRecord(rawEvent.metadata) ? rawEvent.metadata : {},
    },
  };
}

export async function POST(request: NextRequest) {
  const requestStartedAt = performance.now();
  const requestRoute = request.nextUrl.pathname;
  const method = request.method;
  const userAgent = request.headers.get("user-agent") ?? "";

  let parsedBody: unknown;

  try {
    parsedBody = await request.json();
  } catch {
    appLogger.warn({
      event: "track_invalid_json",
      route: requestRoute,
      method,
      responseTimeMs: Number((performance.now() - requestStartedAt).toFixed(2)),
      userAgent,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON body.",
      },
      { status: 400 },
    );
  }

  const incomingEvents = Array.isArray(parsedBody) ? parsedBody : [parsedBody];

  if (incomingEvents.length === 0) {
    appLogger.warn({
      event: "track_empty_batch",
      route: requestRoute,
      method,
      responseTimeMs: Number((performance.now() - requestStartedAt).toFixed(2)),
      userAgent,
    });

    return NextResponse.json(
      {
        success: false,
        error: "At least one event is required.",
      },
      { status: 400 },
    );
  }

  if (incomingEvents.length > 100) {
    appLogger.warn({
      event: "track_batch_too_large",
      route: requestRoute,
      method,
      responseTimeMs: Number((performance.now() - requestStartedAt).toFixed(2)),
      userAgent,
      batchSize: incomingEvents.length,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Batch size too large. Max 100 events per request.",
      },
      { status: 413 },
    );
  }

  const validationErrors: string[] = [];
  const eventsToSave: Array<ValidEvent & { timestamp: Date }> = [];

  incomingEvents.forEach((eventInput, index) => {
    const normalized = normalizeEvent(eventInput);

    if (!normalized.ok) {
      validationErrors.push(`event[${index}]: ${normalized.error}`);
      return;
    }

    eventsToSave.push({
      ...normalized.value,
      timestamp: new Date(),
    });
  });

  if (validationErrors.length > 0) {
    appLogger.warn({
      event: "track_validation_failed",
      route: requestRoute,
      method,
      responseTimeMs: Number((performance.now() - requestStartedAt).toFixed(2)),
      userAgent,
      details: validationErrors,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Validation failed.",
        details: validationErrors,
      },
      { status: 400 },
    );
  }

  const responseTimeMs = Number((performance.now() - requestStartedAt).toFixed(2));

  eventsToSave.forEach((event) => {
    logActivityEvent({
      activityType: event.event_type,
      userId: event.user_id,
      sessionId: event.session_id,
      metadata: event.metadata,
      requestRoute,
      method,
      responseTimeMs,
      userAgent,
    });
  });

  try {
    await connectToDatabase();
    await EventModel.insertMany(eventsToSave);

    logPipelineEvent({
      route: requestRoute,
      method,
      responseTimeMs,
      userAgent,
      stage: "tracking_ingest",
      status: "success",
      inserted: eventsToSave.length,
    });

    return NextResponse.json({
      success: true,
      inserted: eventsToSave.length,
    });
  } catch (error) {
    logErrorEvent({
      event: "track_persist_failure",
      route: requestRoute,
      method,
      responseTimeMs,
      userAgent,
      error,
      metadata: {
        batchSize: eventsToSave.length,
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to persist event data.",
      },
      { status: 500 },
    );
  }
}
