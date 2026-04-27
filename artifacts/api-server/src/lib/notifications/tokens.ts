import crypto from "node:crypto";

const DEFAULT_SECRET = "eventflow-dev-notification-secret";

function getSecret(): string {
  return process.env.NOTIFICATION_TOKEN_SECRET?.trim() || DEFAULT_SECRET;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function encode(data: string): string {
  return Buffer.from(data, "utf8").toString("base64url");
}

function decode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

export function createUnsubscribeToken(input: { eventId: number; userEmail: string }): string {
  const normalized = input.userEmail.trim().toLowerCase();
  const payload = `${input.eventId}:${normalized}`;
  const encodedPayload = encode(payload);
  const signature = sign(payload);
  return `${encodedPayload}.${signature}`;
}

export function parseUnsubscribeToken(token: string): { eventId: number; userEmail: string } | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  try {
    const payload = decode(encodedPayload);
    const expectedSignature = sign(payload);

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const [eventIdRaw, userEmailRaw] = payload.split(":");
    const eventId = Number(eventIdRaw);
    const userEmail = userEmailRaw?.trim().toLowerCase();

    if (!Number.isInteger(eventId) || eventId <= 0 || !userEmail) {
      return null;
    }

    return { eventId, userEmail };
  } catch {
    return null;
  }
}
