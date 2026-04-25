import { Router, type IRouter } from "express";
import { eq, count, desc, gte, and, sql } from "drizzle-orm";
import { db, eventsTable, registrationsTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetUpcomingEventsResponse,
  GetRecentRegistrationsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalEventsResult,
    liveEventsResult,
    upcomingEventsResult,
    totalRegistrationsResult,
    eventsThisMonthResult,
    registrationsThisMonthResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(eventsTable),
    db.select({ count: count() }).from(eventsTable).where(eq(eventsTable.status, "live")),
    db.select({ count: count() }).from(eventsTable).where(eq(eventsTable.status, "upcoming")),
    db.select({ count: count() }).from(registrationsTable).where(sql`status != 'cancelled'`),
    db.select({ count: count() }).from(eventsTable).where(gte(eventsTable.createdAt, startOfMonth)),
    db.select({ count: count() }).from(registrationsTable).where(gte(registrationsTable.registeredAt, startOfMonth)),
  ]);

  const totalRegistrations = totalRegistrationsResult[0]?.count ?? 0;

  const stats = {
    totalEvents: totalEventsResult[0]?.count ?? 0,
    liveEvents: liveEventsResult[0]?.count ?? 0,
    upcomingEvents: upcomingEventsResult[0]?.count ?? 0,
    totalRegistrations,
    totalAttendees: totalRegistrations,
    eventsThisMonth: eventsThisMonthResult[0]?.count ?? 0,
    registrationsThisMonth: registrationsThisMonthResult[0]?.count ?? 0,
  };

  res.json(GetDashboardStatsResponse.parse(stats));
});

router.get("/dashboard/upcoming-events", async (_req, res): Promise<void> => {
  const now = new Date();

  const events = await db
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
    .where(and(
      eq(eventsTable.status, "upcoming"),
      gte(eventsTable.scheduledAt, now)
    ))
    .orderBy(eventsTable.scheduledAt)
    .limit(5);

  res.json(GetUpcomingEventsResponse.parse({ events, total: events.length }));
});

router.get("/dashboard/recent-registrations", async (_req, res): Promise<void> => {
  const regs = await db
    .select()
    .from(registrationsTable)
    .orderBy(desc(registrationsTable.registeredAt))
    .limit(10);

  res.json(GetRecentRegistrationsResponse.parse({ registrations: regs, total: regs.length }));
});

export default router;
