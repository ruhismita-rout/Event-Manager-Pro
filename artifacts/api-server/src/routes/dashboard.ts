import { Router, type IRouter } from "express";
import {
  GetDashboardStatsResponse,
  GetUpcomingEventsResponse,
  GetRecentRegistrationsResponse,
} from "@workspace/api-zod";
import {
  getDashboardStats,
  getRecentRegistrations,
  getUpcomingEvents,
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

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const stats = getDashboardStats();

  res.json(GetDashboardStatsResponse.parse(stats));
});

router.get("/dashboard/upcoming-events", async (_req, res): Promise<void> => {
  const events = getUpcomingEvents(5);

  res.json(GetUpcomingEventsResponse.parse({ events: events.map(stripNullDates), total: events.length }));
});

router.get("/dashboard/recent-registrations", async (_req, res): Promise<void> => {
  const regs = getRecentRegistrations(10).map((reg) => ({
    ...reg,
    event: null,
  }));

  res.json(GetRecentRegistrationsResponse.parse({ registrations: regs, total: regs.length }));
});

export default router;
