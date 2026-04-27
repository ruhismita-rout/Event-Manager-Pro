import ical, { ICalCalendarMethod } from "ical-generator";

type CalendarEvent = {
  id: number;
  title: string;
  description: string;
  hostName: string;
  scheduledAt: Date;
  endsAt: Date | null;
};

function getEventEnd(event: CalendarEvent): Date {
  if (event.endsAt) return event.endsAt;
  return new Date(event.scheduledAt.getTime() + 60 * 60 * 1000);
}

function toGoogleDate(value: Date): string {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function formatEventDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(value);
}

export function buildCalendarLinks(event: CalendarEvent, appBaseUrl: string): {
  google: string;
  outlook: string;
  ics: string;
} {
  const start = event.scheduledAt;
  const end = getEventEnd(event);
  const details = `${event.description}\n\nHost: ${event.hostName}\n\nView event: ${appBaseUrl}/events/${event.id}`;

  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details,
  });

  const outlookParams = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: details,
  });

  return {
    google: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`,
    ics: `${appBaseUrl}/api/events/${event.id}/ics`,
  };
}

export function createEventIcs(event: CalendarEvent, appBaseUrl: string): string {
  const start = event.scheduledAt;
  const end = getEventEnd(event);

  const calendar = ical({
    name: "EventFlow Events",
    prodId: { company: "EventFlow", product: "Virtual Events" },
    method: ICalCalendarMethod.REQUEST,
  });

  calendar.createEvent({
    id: `eventflow-${event.id}@eventflow.app`,
    start,
    end,
    summary: event.title,
    description: `${event.description}\n\nHost: ${event.hostName}\n\nView event: ${appBaseUrl}/events/${event.id}`,
    url: `${appBaseUrl}/events/${event.id}`,
  });

  return calendar.toString();
}
