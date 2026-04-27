import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";

export const notificationLogTable = pgTable("notification_log", {
  id: serial("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull(),
});

export const insertNotificationLogSchema = createInsertSchema(notificationLogTable).omit({ id: true, sentAt: true });
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;
export type NotificationLog = typeof notificationLogTable.$inferSelect;
