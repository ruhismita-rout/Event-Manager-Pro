type EventStatus = "draft" | "upcoming" | "live" | "ended" | "cancelled";
type RegistrationStatus = "confirmed" | "waitlisted" | "cancelled";
type RtcSignalType = "offer" | "answer" | "candidate";

type RtcSignalMessage = {
  seq: number;
  eventId: number;
  fromPeerId: string;
  toPeerId: string;
  type: RtcSignalType;
  payload: unknown;
  createdAt: string;
};

type RtcSession = {
  broadcasterPeerId: string;
  startedAt: string;
};

export type EventRecord = {
  id: number;
  title: string;
  description: string;
  hostName: string;
  scheduledAt: Date;
  endsAt: Date | null;
  status: EventStatus;
  category: string;
  maxAttendees: number | null;
  streamUrl: string | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type RegistrationRecord = {
  id: number;
  eventId: number;
  attendeeName: string;
  attendeeEmail: string;
  status: RegistrationStatus;
  registeredAt: Date;
};

export type ChatMessageRecord = {
  id: number;
  eventId: number;
  senderName: string;
  message: string;
  isPinned: boolean;
  isDeleted: boolean;
  sentAt: Date;
};

type EventWithCount = EventRecord & { registrationCount: number };

const events = new Map<number, EventRecord>();
const registrations = new Map<number, RegistrationRecord>();
const chatMessages = new Map<number, ChatMessageRecord>();

let nextEventId = 1;
let nextRegistrationId = 1;
let nextChatId = 1;
let nextPeerId = 1;
let nextSignalSeq = 1;

const rtcSessions = new Map<number, RtcSession>();
const rtcSignals = new Map<number, RtcSignalMessage[]>();

function extractYouTubeVideoId(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return id || null;
    }

    if (host.endsWith("youtube.com")) {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      if (url.pathname.startsWith("/embed/")) {
        const id = url.pathname.replace("/embed/", "").split("/")[0];
        return id || null;
      }

      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.replace("/shorts/", "").split("/")[0];
        return id || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeStreamUrl(raw: string): string {
  const value = raw.trim();

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    const youtubeId = extractYouTubeVideoId(value);
    if (youtubeId) {
      return `https://www.youtube.com/embed/${youtubeId}`;
    }

    if (host.endsWith("vimeo.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const maybeId = parts[parts.length - 1];
      if (maybeId && /^\d+$/.test(maybeId)) {
        return `https://player.vimeo.com/video/${maybeId}`;
      }
    }

    if (host.endsWith("twitch.tv") && !host.startsWith("player.")) {
      const channel = url.pathname.split("/").filter(Boolean)[0];
      if (channel) {
        const parent = process.env.STREAM_TWITCH_PARENT ?? "localhost";
        return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parent)}`;
      }
    }

    return value;
  } catch {
    return value;
  }
}

function resolveStreamUrl(eventId: number, eventStreamUrl: string | null): string | null {
  const template = process.env.STREAM_URL_TEMPLATE?.trim();
  const defaultStreamUrl = process.env.STREAM_DEFAULT_URL?.trim();
  const candidate =
    eventStreamUrl?.trim() ||
    (template ? template.replaceAll("{eventId}", String(eventId)) : "") ||
    defaultStreamUrl ||
    "";

  if (!candidate) {
    return null;
  }

  return normalizeStreamUrl(candidate);
}

function makePeerId(): string {
  return `peer-${nextPeerId++}`;
}

function getSignalQueue(eventId: number): RtcSignalMessage[] {
  const existing = rtcSignals.get(eventId);
  if (existing) {
    return existing;
  }

  const queue: RtcSignalMessage[] = [];
  rtcSignals.set(eventId, queue);
  return queue;
}

function registrationCountFor(eventId: number): number {
  let total = 0;
  for (const reg of registrations.values()) {
    if (reg.eventId === eventId && reg.status !== "cancelled") {
      total += 1;
    }
  }
  return total;
}

function withCount(event: EventRecord): EventWithCount {
  return {
    ...event,
    registrationCount: registrationCountFor(event.id),
  };
}

export function listEvents(params: {
  status?: "upcoming" | "live" | "ended" | "all";
  search?: string;
  limit: number;
  offset: number;
}): { events: EventWithCount[]; total: number } {
  const search = params.search?.trim().toLowerCase();

  const filtered = Array.from(events.values())
    .filter((event) => {
      if (params.status && params.status !== "all" && event.status !== params.status) {
        return false;
      }
      if (search && !event.title.toLowerCase().includes(search)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

  const total = filtered.length;
  const paged = filtered.slice(params.offset, params.offset + params.limit).map(withCount);

  return { events: paged, total };
}

export function createEvent(data: {
  title: string;
  description: string;
  hostName: string;
  scheduledAt: Date;
  endsAt?: Date | null;
  category: string;
  maxAttendees?: number | null;
  streamUrl?: string | null;
  thumbnailUrl?: string | null;
  isPublic: boolean;
}): EventWithCount {
  const now = new Date();
  const event: EventRecord = {
    id: nextEventId++,
    title: data.title,
    description: data.description,
    hostName: data.hostName,
    scheduledAt: data.scheduledAt,
    endsAt: data.endsAt ?? null,
    status: "upcoming",
    category: data.category,
    maxAttendees: data.maxAttendees ?? null,
    streamUrl: data.streamUrl ?? null,
    thumbnailUrl: data.thumbnailUrl ?? null,
    isPublic: data.isPublic,
    createdAt: now,
    updatedAt: now,
  };

  events.set(event.id, event);
  return withCount(event);
}

export function getEvent(eventId: number): EventWithCount | null {
  const event = events.get(eventId);
  if (!event) return null;
  return withCount(event);
}

export function updateEvent(
  eventId: number,
  updates: Partial<{
    title: string;
    description: string;
    hostName: string;
    scheduledAt: Date;
    endsAt: Date | null;
    category: string;
    maxAttendees: number | null;
    streamUrl: string | null;
    thumbnailUrl: string | null;
    isPublic: boolean;
    status: EventStatus;
  }>,
): EventWithCount | null {
  const existing = events.get(eventId);
  if (!existing) return null;

  const updated: EventRecord = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  };

  events.set(eventId, updated);
  return withCount(updated);
}

export function deleteEvent(eventId: number): EventRecord | null {
  const existing = events.get(eventId);
  if (!existing) return null;

  events.delete(eventId);

  for (const reg of registrations.values()) {
    if (reg.eventId === eventId) {
      registrations.delete(reg.id);
    }
  }

  for (const msg of chatMessages.values()) {
    if (msg.eventId === eventId) {
      chatMessages.delete(msg.id);
    }
  }

  rtcSessions.delete(eventId);
  rtcSignals.delete(eventId);

  return existing;
}

export function startStream(eventId: number):
  | { error: "event-not-found" | "missing-stream-url" }
  | { eventId: number; status: "live"; streamUrl: string; startedAt: Date } {
  const event = events.get(eventId);
  if (!event) return { error: "event-not-found" };

  const streamUrl = resolveStreamUrl(eventId, event.streamUrl);
  if (!streamUrl) {
    return { error: "missing-stream-url" };
  }

  const updated: EventRecord = {
    ...event,
    status: "live",
    streamUrl,
    updatedAt: new Date(),
  };
  events.set(eventId, updated);

  return {
    eventId,
    status: "live",
    streamUrl,
    startedAt: new Date(),
  };
}

export function endStream(eventId: number): { eventId: number; status: "ended"; streamUrl: null; startedAt: null } | null {
  const event = events.get(eventId);
  if (!event) return null;

  const updated: EventRecord = {
    ...event,
    status: "ended",
    updatedAt: new Date(),
  };
  events.set(eventId, updated);
  rtcSessions.delete(eventId);

  return {
    eventId,
    status: "ended",
    streamUrl: null,
    startedAt: null,
  };
}

export function listRegistrations(eventId: number): RegistrationRecord[] {
  return Array.from(registrations.values())
    .filter((reg) => reg.eventId === eventId)
    .sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime());
}

export function registerForEvent(
  eventId: number,
  data: { attendeeName: string; attendeeEmail: string },
): { registration: RegistrationRecord; event: EventWithCount } | { error: "event-not-found" | "registration-closed" } {
  const event = events.get(eventId);
  if (!event) {
    return { error: "event-not-found" };
  }

  if (event.status === "ended" || event.status === "cancelled") {
    return { error: "registration-closed" };
  }

  const currentRegistrations = registrationCountFor(eventId);
  const status: RegistrationStatus =
    event.maxAttendees && currentRegistrations >= event.maxAttendees
      ? "waitlisted"
      : "confirmed";

  const registration: RegistrationRecord = {
    id: nextRegistrationId++,
    eventId,
    attendeeName: data.attendeeName,
    attendeeEmail: data.attendeeEmail,
    status,
    registeredAt: new Date(),
  };

  registrations.set(registration.id, registration);

  return {
    registration,
    event: withCount(event),
  };
}

export function cancelRegistration(registrationId: number): RegistrationRecord | null {
  const existing = registrations.get(registrationId);
  if (!existing || existing.status === "cancelled") {
    return null;
  }

  const updated: RegistrationRecord = {
    ...existing,
    status: "cancelled",
  };

  registrations.set(registrationId, updated);
  return updated;
}

export function listChatMessages(params: {
  eventId: number;
  limit: number;
  before?: number;
}): ChatMessageRecord[] {
  const filtered = Array.from(chatMessages.values())
    .filter((msg) => msg.eventId === params.eventId && !msg.isDeleted)
    .filter((msg) => (params.before ? msg.id < params.before : true))
    .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
    .slice(0, params.limit)
    .reverse();

  return filtered;
}

export function sendChatMessage(
  eventId: number,
  data: { senderName: string; message: string },
): ChatMessageRecord {
  const message: ChatMessageRecord = {
    id: nextChatId++,
    eventId,
    senderName: data.senderName,
    message: data.message,
    isPinned: false,
    isDeleted: false,
    sentAt: new Date(),
  };

  chatMessages.set(message.id, message);
  return message;
}

export function deleteChatMessage(messageId: number): ChatMessageRecord | null {
  const existing = chatMessages.get(messageId);
  if (!existing) return null;

  const updated: ChatMessageRecord = {
    ...existing,
    isDeleted: true,
  };
  chatMessages.set(messageId, updated);
  return updated;
}

export function getDashboardStats(): {
  totalEvents: number;
  liveEvents: number;
  upcomingEvents: number;
  totalRegistrations: number;
  totalAttendees: number;
  eventsThisMonth: number;
  registrationsThisMonth: number;
} {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const allEvents = Array.from(events.values());
  const allRegistrations = Array.from(registrations.values());
  const activeRegistrations = allRegistrations.filter((reg) => reg.status !== "cancelled");

  return {
    totalEvents: allEvents.length,
    liveEvents: allEvents.filter((event) => event.status === "live").length,
    upcomingEvents: allEvents.filter((event) => event.status === "upcoming").length,
    totalRegistrations: activeRegistrations.length,
    totalAttendees: activeRegistrations.length,
    eventsThisMonth: allEvents.filter((event) => event.createdAt >= startOfMonth).length,
    registrationsThisMonth: allRegistrations.filter((reg) => reg.registeredAt >= startOfMonth).length,
  };
}

export function getUpcomingEvents(limit = 5): EventWithCount[] {
  const now = new Date();
  return Array.from(events.values())
    .filter((event) => event.status === "upcoming" && event.scheduledAt >= now)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, limit)
    .map(withCount);
}

export function getRecentRegistrations(limit = 10): RegistrationRecord[] {
  return Array.from(registrations.values())
    .sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime())
    .slice(0, limit);
}

export function startScreenShare(eventId: number):
  | { error: "event-not-found" }
  | { eventId: number; broadcasterPeerId: string; startedAt: string } {
  const event = events.get(eventId);
  if (!event) {
    return { error: "event-not-found" };
  }

  const session = rtcSessions.get(eventId) ?? {
    broadcasterPeerId: makePeerId(),
    startedAt: new Date().toISOString(),
  };

  rtcSessions.set(eventId, session);
  events.set(eventId, {
    ...event,
    status: "live",
    updatedAt: new Date(),
  });

  return {
    eventId,
    broadcasterPeerId: session.broadcasterPeerId,
    startedAt: session.startedAt,
  };
}

export function stopScreenShare(eventId: number): boolean {
  const event = events.get(eventId);
  if (!event) return false;

  rtcSessions.delete(eventId);
  events.set(eventId, {
    ...event,
    status: "ended",
    updatedAt: new Date(),
  });
  return true;
}

export function getScreenShareState(eventId: number): {
  active: boolean;
  broadcasterPeerId: string | null;
  startedAt: string | null;
} {
  const session = rtcSessions.get(eventId);
  if (!session) {
    return { active: false, broadcasterPeerId: null, startedAt: null };
  }

  return {
    active: true,
    broadcasterPeerId: session.broadcasterPeerId,
    startedAt: session.startedAt,
  };
}

export function createRtcPeer(): string {
  return makePeerId();
}

export function sendRtcSignal(eventId: number, signal: {
  fromPeerId: string;
  toPeerId: string;
  type: RtcSignalType;
  payload: unknown;
}): RtcSignalMessage {
  const message: RtcSignalMessage = {
    seq: nextSignalSeq++,
    eventId,
    fromPeerId: signal.fromPeerId,
    toPeerId: signal.toPeerId,
    type: signal.type,
    payload: signal.payload,
    createdAt: new Date().toISOString(),
  };

  getSignalQueue(eventId).push(message);
  return message;
}

export function getRtcSignals(eventId: number, peerId: string, sinceSeq = 0): RtcSignalMessage[] {
  return getSignalQueue(eventId).filter((message) => message.toPeerId === peerId && message.seq > sinceSeq);
}
