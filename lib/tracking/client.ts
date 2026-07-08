"use client";

type EventMetadata = Record<string, unknown>;

type TrackPayload = {
  event_type: string;
  user_id: string;
  session_id: string;
  metadata: EventMetadata;
};

type TrackOptions = {
  immediate?: boolean;
  useBeacon?: boolean;
};

const USER_ID_KEY = "demo_user_id";
const SESSION_ID_KEY = "demo_session_id";
const TRACK_ENDPOINT = "/api/track";
const FLUSH_INTERVAL_MS = 1500;
const MAX_QUEUE_SIZE = 12;

let queue: TrackPayload[] = [];
let flushTimer: number | null = null;

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function ensureTrackingIds() {
  if (!isBrowser()) {
    return { userId: "", sessionId: "" };
  }

  const userId = getOrCreateUserId();
  const sessionId = getOrCreateSessionId();
  return { userId, sessionId };
}

export function getOrCreateUserId() {
  const existing = localStorage.getItem(USER_ID_KEY);

  if (existing) {
    return existing;
  }

  const created = generateId();
  localStorage.setItem(USER_ID_KEY, created);
  return created;
}

export function getOrCreateSessionId() {
  const existing = sessionStorage.getItem(SESSION_ID_KEY);

  if (existing) {
    return existing;
  }

  const created = generateId();
  sessionStorage.setItem(SESSION_ID_KEY, created);
  return created;
}

async function postEvents(
  events: TrackPayload[],
  options: { useBeacon?: boolean } = {},
) {
  const payload = events.length === 1 ? events[0] : events;
  const serialized = JSON.stringify(payload);

  if (options.useBeacon && navigator.sendBeacon) {
    const blob = new Blob([serialized], { type: "application/json" });
    navigator.sendBeacon(TRACK_ENDPOINT, blob);
    return;
  }

  await fetch(TRACK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: serialized,
    keepalive: true,
  });
}

function scheduleFlush() {
  if (flushTimer !== null) {
    return;
  }

  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushEventQueue();
  }, FLUSH_INTERVAL_MS);
}

export function trackEvent(
  eventType: string,
  metadata: EventMetadata = {},
  options: TrackOptions = {},
) {
  if (!isBrowser()) {
    return;
  }

  const { userId, sessionId } = ensureTrackingIds();

  const payload: TrackPayload = {
    event_type: eventType,
    user_id: userId,
    session_id: sessionId,
    metadata,
  };

  if (options.immediate) {
    void postEvents([payload], { useBeacon: options.useBeacon });
    return;
  }

  queue.push(payload);

  if (queue.length >= MAX_QUEUE_SIZE) {
    void flushEventQueue();
    return;
  }

  scheduleFlush();
}

export async function flushEventQueue(
  options: { useBeacon?: boolean } = {},
): Promise<void> {
  if (!isBrowser() || queue.length === 0) {
    return;
  }

  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const eventsToFlush = [...queue];
  queue = [];

  try {
    await postEvents(eventsToFlush, options);
  } catch {
    queue = [...eventsToFlush, ...queue].slice(-MAX_QUEUE_SIZE * 2);
  }
}
