import { Router, type IRouter } from "express";
import { eq, desc, count, sql, ilike, and } from "drizzle-orm";
import { db, eventsTable, registrationsTable } from "@workspace/db";
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

  const { status, search, limit, offset } = parsed.data;

  const conditions: ReturnType<typeof eq>[] = [];
  if (status && status !== "all") {
    conditions.push(eq(eventsTable.status, status));
  }
  if (search) {
    conditions.push(ilike(eventsTable.title, `%${search}%`));
  }

  const [totalResult, rawEvents] = await Promise.all([
    db
      .select({ count: count() })
      .from(eventsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
    db
      .select({
        id: eventsTable.id,
        title: eventsTable.title,
        description: eventsTable.description,
        hostName: eventsTable.hostName,
        scheduledAt: eventsTable.scheduledAt,
        endsAt: eventsTable.endsAt,
        status: eventsTable.status,
        category: eventsTable.category,
        maxAttendees: eventsTable.maxAttendees,
        streamUrl: eventsTable.streamUrl,
        thumbnailUrl: eventsTable.thumbnailUrl,
        isPublic: eventsTable.isPublic,
        createdAt: eventsTable.createdAt,
        updatedAt: eventsTable.updatedAt,
        registrationCount: sql<number>`(SELECT COUNT(*) FROM registrations WHERE event_id = ${eventsTable.id} AND status != 'cancelled')::int`,
      })
      .from(eventsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(eventsTable.scheduledAt))
      .limit(limit)
      .offset(offset),
  ]);

  res.json(ListEventsResponse.parse({ events: rawEvents.map(stripNullDates), total: totalResult[0]?.count ?? 0 }));
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [event] = await db.insert(eventsTable).values({
    ...parsed.data,
    status: "upcoming",
  }).returning();

  const eventWithCount = {
    ...event,
    registrationCount: 0,
  };

  res.status(201).json(GetEventResponse.parse(stripNullDates(eventWithCount)));
});

router.get("/events/:eventId", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [event] = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      description: eventsTable.description,
      hostName: eventsTable.hostName,
      scheduledAt: eventsTable.scheduledAt,
      endsAt: eventsTable.endsAt,
      status: eventsTable.status,
      category: eventsTable.category,
      maxAttendees: eventsTable.maxAttendees,
      streamUrl: eventsTable.streamUrl,
      thumbnailUrl: eventsTable.thumbnailUrl,
      isPublic: eventsTable.isPublic,
      createdAt: eventsTable.createdAt,
      updatedAt: eventsTable.updatedAt,
      registrationCount: sql<number>`(SELECT COUNT(*) FROM registrations WHERE event_id = ${eventsTable.id} AND status != 'cancelled')::int`,
    })
    .from(eventsTable)
    .where(eq(eventsTable.id, params.data.eventId));

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

  const updateData: Partial<typeof eventsTable.$inferInsert> = {};
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

  const [updated] = await db
    .update(eventsTable)
    .set(updateData)
    .where(eq(eventsTable.id, params.data.eventId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const regCount = await db
    .select({ count: count() })
    .from(registrationsTable)
    .where(and(eq(registrationsTable.eventId, updated.id), sql`status != 'cancelled'`));

  res.json(UpdateEventResponse.parse(stripNullDates({ ...updated, registrationCount: regCount[0]?.count ?? 0 })));
});

router.delete("/events/:eventId", async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(eventsTable)
    .where(eq(eventsTable.id, params.data.eventId))
    .returning();

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

  const streamUrl = `https://stream.eventflow.live/${params.data.eventId}`;

  const [updated] = await db
    .update(eventsTable)
    .set({ status: "live", streamUrl })
    .where(eq(eventsTable.id, params.data.eventId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(StartStreamResponse.parse({
    eventId: updated.id,
    status: "live",
    streamUrl,
    startedAt: new Date(),
  }));
});

router.post("/events/:eventId/end-stream", async (req, res): Promise<void> => {
  const params = EndStreamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db
    .update(eventsTable)
    .set({ status: "ended" })
    .where(eq(eventsTable.id, params.data.eventId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(EndStreamResponse.parse({
    eventId: updated.id,
    status: "ended",
    streamUrl: null,
    startedAt: null,
  }));
});

export default router;
