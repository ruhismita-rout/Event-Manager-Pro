import { Router, type IRouter } from "express";
import {
  ListEventsQueryParams,
  ListEventsResponse,
  CreateEventBody,
  GetEventParams,
  GetEventResponse,
  UpdateEventParams,
  UpdateEventBody,
  UpdateEventResponse,
  DeleteEventParams,
  StartStreamParams,
  StartStreamResponse,
  EndStreamParams,
  EndStreamResponse,
} from "@workspace/api-zod";
import {
  createEvent,
  deleteEvent,
  endStream,
  getEvent,
  createRtcPeer,
  getRtcSignals,
  getScreenShareState,
  listEvents,
  sendRtcSignal,
  startScreenShare,
  startStream,
  stopScreenShare,
  updateEvent,
} from "../lib/store";

const router: IRouter = Router();

function stripNullDates<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj } as T;
  for (const key of Object.keys(result) as (keyof T)[]) {
    if (result[key] === null && (key === "endsAt" || key === "streamUrl" || key === "thumbnailUrl")) {
      delete result[key];
    }
  }
  return result;
}

router.get("/events", async (req, res): Promise<void> => {
  const parsed = ListEventsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { events, total } = listEvents(parsed.data);
  res.json(ListEventsResponse.parse({ events: events.map(stripNullDates), total }));
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const event = createEvent(parsed.data);
  res.status(201).json(GetEventResponse.parse(stripNullDates(event)));
});

router.get("/events/:eventId", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const event = getEvent(params.data.eventId);

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(GetEventResponse.parse(stripNullDates(event)));
});

router.put("/events/:eventId", async (req, res): Promise<void> => {
  const params = UpdateEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: {
    title?: string;
    description?: string;
    hostName?: string;
    scheduledAt?: Date;
    endsAt?: Date | null;
    category?: string;
    maxAttendees?: number | null;
    streamUrl?: string | null;
    thumbnailUrl?: string | null;
    isPublic?: boolean;
    status?: "draft" | "upcoming" | "live" | "ended" | "cancelled";
  } = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.hostName !== undefined) updateData.hostName = parsed.data.hostName;
  if (parsed.data.scheduledAt !== undefined) updateData.scheduledAt = parsed.data.scheduledAt;
  if (parsed.data.endsAt !== undefined) updateData.endsAt = parsed.data.endsAt ?? null;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.maxAttendees !== undefined) updateData.maxAttendees = parsed.data.maxAttendees ?? null;
  if (parsed.data.streamUrl !== undefined) updateData.streamUrl = parsed.data.streamUrl ?? null;
  if (parsed.data.thumbnailUrl !== undefined) updateData.thumbnailUrl = parsed.data.thumbnailUrl ?? null;
  if (parsed.data.isPublic !== undefined) updateData.isPublic = parsed.data.isPublic;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const updated = updateEvent(params.data.eventId, updateData);

  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(UpdateEventResponse.parse(stripNullDates(updated)));
});

router.delete("/events/:eventId", async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const deleted = deleteEvent(params.data.eventId);

  if (!deleted) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/events/:eventId/start-stream", async (req, res): Promise<void> => {
  const params = StartStreamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const updated = startStream(params.data.eventId);

  if ("error" in updated && updated.error === "event-not-found") {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  if ("error" in updated && updated.error === "missing-stream-url") {
    res.status(400).json({
      error:
        "No livestream URL configured. Set event streamUrl, or configure STREAM_URL_TEMPLATE / STREAM_DEFAULT_URL.",
    });
    return;
  }

  res.json(StartStreamResponse.parse({
    eventId: updated.eventId,
    status: "live",
    streamUrl: updated.streamUrl,
    startedAt: updated.startedAt,
  }));
});

router.post("/events/:eventId/end-stream", async (req, res): Promise<void> => {
  const params = EndStreamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const updated = endStream(params.data.eventId);

  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(EndStreamResponse.parse({
    eventId: updated.eventId,
    status: "ended",
    streamUrl: null,
    startedAt: null,
  }));
});

router.get("/events/:eventId/screen-share/state", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  res.json(getScreenShareState(params.data.eventId));
});

router.post("/events/:eventId/screen-share/start", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = startScreenShare(params.data.eventId);
  if ("error" in result) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.status(201).json({
    eventId: result.eventId,
    broadcasterPeerId: result.broadcasterPeerId,
    startedAt: result.startedAt,
  });
});

router.post("/events/:eventId/screen-share/stop", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!stopScreenShare(params.data.eventId)) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/events/:eventId/screen-share/peer", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  res.status(201).json({ peerId: createRtcPeer() });
});

router.post("/events/:eventId/screen-share/signals", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = req.body as {
    fromPeerId?: string;
    toPeerId?: string;
    type?: "offer" | "answer" | "candidate";
    payload?: unknown;
  };

  if (!body.fromPeerId || !body.toPeerId || !body.type) {
    res.status(400).json({ error: "Invalid signaling payload" });
    return;
  }

  const signal = sendRtcSignal(params.data.eventId, {
    fromPeerId: body.fromPeerId,
    toPeerId: body.toPeerId,
    type: body.type,
    payload: body.payload,
  });

  res.status(201).json(signal);
});

router.get("/events/:eventId/screen-share/signals", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const peerId = typeof req.query.peerId === "string" ? req.query.peerId : "";
  const since = typeof req.query.since === "string" ? Number(req.query.since) : 0;

  if (!peerId) {
    res.status(400).json({ error: "peerId is required" });
    return;
  }

  res.json({ signals: getRtcSignals(params.data.eventId, peerId, Number.isNaN(since) ? 0 : since) });
});

export default router;
