import { model, models, Schema } from "mongoose";

export type EventDocument = {
  event_type: string;
  user_id: string;
  session_id: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
};

const eventSchema = new Schema<EventDocument>(
  {
    event_type: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    session_id: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    collection: "events",
    versionKey: false,
  },
);

export const EventModel =
  models.Event || model<EventDocument>("Event", eventSchema);
