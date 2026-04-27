import {
  type EventRecord,
  type RegistrationRecord,
  createNotificationLog,
  getUpcomingEventsInWindow,
  hasNotificationLog,
  isNotificationsUnsubscribed,
  listRegistrations,
  type NotificationType,
} from "../store";
import { sendEmail } from "../email/sender";
import { confirmationEmail, reminderEmail } from "../email/templates";
import { createUnsubscribeToken } from "./tokens";

function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL?.trim() || process.env.VITE_API_BASE_URL?.trim() || "http://localhost:3001";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildUnsubscribeUrl(eventId: number, userEmail: string): string {
  const appBaseUrl = getAppBaseUrl();
  const token = createUnsubscribeToken({ eventId, userEmail });
  return `${appBaseUrl}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
}

export async function sendRsvpConfirmationEmail(event: EventRecord, registration: RegistrationRecord): Promise<void> {
  const userEmail = normalizeEmail(registration.attendeeEmail);
  const type: NotificationType = "confirmation";

  if (isNotificationsUnsubscribed(event.id, userEmail)) {
    createNotificationLog({ eventId: event.id, userEmail, type, status: "skipped_unsubscribed" });
    return;
  }

  if (hasNotificationLog(event.id, userEmail, type)) {
    return;
  }

  const appBaseUrl = getAppBaseUrl();
  const payload = confirmationEmail(
    {
      id: event.id,
      title: event.title,
      description: event.description,
      hostName: event.hostName,
      scheduledAt: event.scheduledAt,
      endsAt: event.endsAt,
      streamUrl: event.streamUrl,
    },
    {
      attendeeName: registration.attendeeName,
      attendeeEmail: userEmail,
    },
    {
      appBaseUrl,
      unsubscribeUrl: buildUnsubscribeUrl(event.id, userEmail),
    },
  );

  const result = await sendEmail({
    to: userEmail,
    subject: payload.subject,
    html: payload.html,
  });

  createNotificationLog({
    eventId: event.id,
    userEmail,
    type,
    status: result.status,
  });
}

async function sendReminderForType(params: {
  type: "reminder_24h" | "reminder_1h";
  windowStart: Date;
  windowEnd: Date;
}): Promise<{ attempted: number; sent: number; skipped: number }> {
  const appBaseUrl = getAppBaseUrl();
  const events = getUpcomingEventsInWindow(params.windowStart, params.windowEnd);

  let attempted = 0;
  let sent = 0;
  let skipped = 0;

  for (const event of events) {
    const registrations = listRegistrations(event.id).filter((registration) => registration.status !== "cancelled");

    for (const registration of registrations) {
      const userEmail = normalizeEmail(registration.attendeeEmail);

      if (isNotificationsUnsubscribed(event.id, userEmail)) {
        skipped += 1;
        createNotificationLog({
          eventId: event.id,
          userEmail,
          type: params.type,
          status: "skipped_unsubscribed",
        });
        continue;
      }

      if (hasNotificationLog(event.id, userEmail, params.type)) {
        skipped += 1;
        continue;
      }

      attempted += 1;

      const payload = reminderEmail(
        {
          id: event.id,
          title: event.title,
          description: event.description,
          hostName: event.hostName,
          scheduledAt: event.scheduledAt,
          endsAt: event.endsAt,
          streamUrl: event.streamUrl,
        },
        {
          attendeeName: registration.attendeeName,
          attendeeEmail: userEmail,
        },
        {
          appBaseUrl,
          kind: params.type,
          unsubscribeUrl: buildUnsubscribeUrl(event.id, userEmail),
        },
      );

      const result = await sendEmail({
        to: userEmail,
        subject: payload.subject,
        html: payload.html,
      });

      if (result.ok) {
        sent += 1;
      }

      createNotificationLog({
        eventId: event.id,
        userEmail,
        type: params.type,
        status: result.status,
      });
    }
  }

  return { attempted, sent, skipped };
}

export async function runReminderSweep(now = new Date()): Promise<{
  reminder24h: { attempted: number; sent: number; skipped: number };
  reminder1h: { attempted: number; sent: number; skipped: number };
}> {
  const reminder24h = await sendReminderForType({
    type: "reminder_24h",
    windowStart: new Date(now.getTime() + 23 * 60 * 60 * 1000),
    windowEnd: new Date(now.getTime() + 25 * 60 * 60 * 1000),
  });

  const reminder1h = await sendReminderForType({
    type: "reminder_1h",
    windowStart: new Date(now.getTime() + 50 * 60 * 1000),
    windowEnd: new Date(now.getTime() + 70 * 60 * 1000),
  });

  return {
    reminder24h,
    reminder1h,
  };
}
