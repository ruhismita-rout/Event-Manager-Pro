import { buildCalendarLinks, formatEventDateTime } from "./calendar";

type TemplateEvent = {
  id: number;
  title: string;
  description: string;
  hostName: string;
  scheduledAt: Date;
  endsAt: Date | null;
  streamUrl: string | null;
};

type TemplateAttendee = {
  attendeeName: string;
  attendeeEmail: string;
};

type EmailPayload = {
  subject: string;
  html: string;
};

function pageTemplate(content: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#FEFCE8;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#0A0A0A;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;">
      <tr>
        <td style="background:#F97316;color:#ffffff;padding:16px 20px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;">
          EventFlow
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;border:2px solid #0A0A0A;box-shadow:4px 4px 0 #0A0A0A;padding:32px;">
          ${content}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function calendarLinksSection(links: { google: string; outlook: string; ics: string }): string {
  return `
  <div style="margin-top:24px;">
    <p style="margin:0 0 10px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Add to Calendar</p>
    <table role="presentation" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding-right:8px;padding-bottom:8px;">
          <a href="${links.google}" style="display:inline-block;padding:8px 12px;border:2px solid #0A0A0A;text-decoration:none;color:#0A0A0A;font-size:13px;">Google Calendar</a>
        </td>
        <td style="padding-right:8px;padding-bottom:8px;">
          <a href="${links.ics}" style="display:inline-block;padding:8px 12px;border:2px solid #0A0A0A;text-decoration:none;color:#0A0A0A;font-size:13px;">Apple / ICS</a>
        </td>
        <td style="padding-bottom:8px;">
          <a href="${links.outlook}" style="display:inline-block;padding:8px 12px;border:2px solid #0A0A0A;text-decoration:none;color:#0A0A0A;font-size:13px;">Outlook</a>
        </td>
      </tr>
    </table>
  </div>`;
}

function footer(unsubscribeUrl: string): string {
  return `
    <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#52525B;">
      You’re receiving EventFlow notifications for this event.
      <a href="${unsubscribeUrl}" style="color:#52525B;">Manage notifications / unsubscribe</a>
    </p>
  `;
}

export function confirmationEmail(
  event: TemplateEvent,
  attendee: TemplateAttendee,
  opts: { appBaseUrl: string; unsubscribeUrl: string },
): EmailPayload {
  const links = buildCalendarLinks(event, opts.appBaseUrl);
  const eventDate = formatEventDateTime(event.scheduledAt);
  const eventUrl = `${opts.appBaseUrl}/events/${event.id}`;

  const subject = `You're confirmed: ${event.title}`;

  const html = pageTemplate(`
    <p style="margin:0 0 16px;font-size:14px;color:#52525B;">Hi ${attendee.attendeeName}, your RSVP is confirmed.</p>
    <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;">${event.title}</h1>
    <p style="margin:0 0 8px;font-size:16px;"><strong>Host:</strong> ${event.hostName}</p>
    <p style="margin:0 0 16px;font-size:16px;"><strong>When:</strong> ${eventDate}</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#27272A;">${event.description}</p>

    <p style="margin:0 0 18px;">
      <a href="${eventUrl}" style="display:inline-block;background:#7C3AED;color:#ffffff;text-decoration:none;padding:12px 18px;border:2px solid #0A0A0A;">View Event</a>
    </p>

    ${calendarLinksSection(links)}
    ${footer(opts.unsubscribeUrl)}
  `);

  return { subject, html };
}

export function reminderEmail(
  event: TemplateEvent,
  attendee: TemplateAttendee,
  opts: { appBaseUrl: string; unsubscribeUrl: string; kind: "reminder_24h" | "reminder_1h" },
): EmailPayload {
  const links = buildCalendarLinks(event, opts.appBaseUrl);
  const eventDate = formatEventDateTime(event.scheduledAt);
  const startsIn = opts.kind === "reminder_24h" ? "24 hours" : "1 hour";
  const streamUrl = event.streamUrl || `${opts.appBaseUrl}/events/${event.id}`;

  const subject = `Your event starts in ${startsIn}: ${event.title}`;

  const html = pageTemplate(`
    <p style="margin:0 0 16px;font-size:14px;color:#52525B;">Hi ${attendee.attendeeName}, this is your EventFlow reminder.</p>
    <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;">${event.title}</h1>
    <p style="margin:0 0 8px;font-size:16px;"><strong>Starts in:</strong> ${startsIn}</p>
    <p style="margin:0 0 8px;font-size:16px;"><strong>Host:</strong> ${event.hostName}</p>
    <p style="margin:0 0 18px;font-size:16px;"><strong>When:</strong> ${eventDate}</p>

    <p style="margin:0 0 18px;">
      <a href="${streamUrl}" style="display:inline-block;background:#7C3AED;color:#ffffff;text-decoration:none;padding:12px 18px;border:2px solid #0A0A0A;">Join Stream</a>
    </p>

    ${calendarLinksSection(links)}
    ${footer(opts.unsubscribeUrl)}
  `);

  return { subject, html };
}
