import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, registrationsTable, eventsTable } from "@workspace/db";
import {
  ListEventRegistrationsParams,
  ListEventRegistrationsResponse,
  RegisterForEventParams,
  RegisterForEventBody,
  GetEventResponse,
  CancelRegistrationParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events/:eventId/registrations", async (req, res): Promise<void> => {
  const params = ListEventRegistrationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const regs = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.eventId, params.data.eventId))
    .orderBy(registrationsTable.registeredAt);

  res.json(ListEventRegistrationsResponse.parse({ registrations: regs, total: regs.length }));
});

router.post("/events/:eventId/registrations", async (req, res): Promise<void> => {
  const params = RegisterForEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = RegisterForEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
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

  if (event.status === "ended" || event.status === "cancelled") {
    res.status(400).json({ error: "Cannot register for a completed or cancelled event" });
    return;
  }

  const regStatus =
    event.maxAttendees && event.registrationCount >= event.maxAttendees
      ? "waitlisted"
      : "confirmed";

  const [reg] = await db.insert(registrationsTable).values({
    eventId: params.data.eventId,
    attendeeName: parsed.data.attendeeName,
    attendeeEmail: parsed.data.attendeeEmail,
    status: regStatus,
  }).returning();

  res.status(201).json({
    ...reg,
    event: GetEventResponse.parse(event),
  });
});

router.delete("/registrations/:registrationId", async (req, res): Promise<void> => {
  const params = CancelRegistrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db
    .update(registrationsTable)
    .set({ status: "cancelled" })
    .where(and(
      eq(registrationsTable.id, params.data.registrationId),
      sql`status != 'cancelled'`
    ))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Registration not found or already cancelled" });
    return;
  }

  res.sendStatus(204);
});

export default router;
