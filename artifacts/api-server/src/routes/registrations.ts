import { Router, type IRouter } from "express";
import {
  ListEventRegistrationsParams,
  ListEventRegistrationsResponse,
  RegisterForEventParams,
  RegisterForEventBody,
  GetEventResponse,
  CancelRegistrationParams,
} from "@workspace/api-zod";
import {
  cancelRegistration,
  listRegistrations,
  registerForEvent,
} from "../lib/store";
import { sendRsvpConfirmationEmail } from "../lib/notifications/service";

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

router.get("/events/:eventId/registrations", async (req, res): Promise<void> => {
  const params = ListEventRegistrationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const regs = listRegistrations(params.data.eventId).map((reg) => ({
    ...reg,
    event: null,
  }));

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

  const result = registerForEvent(params.data.eventId, parsed.data);
  if ("error" in result) {
    if (result.error === "event-not-found") {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    res.status(400).json({ error: "Cannot register for a completed or cancelled event" });
    return;
  }

  const { registration, event } = result;

  res.status(201).json({
    ...registration,
    event: GetEventResponse.parse(stripNullDates(event)),
  });

  void sendRsvpConfirmationEmail(event, registration);
});

router.post("/events/:id/rsvp", async (req, res): Promise<void> => {
  const eventId = Number(req.params.id);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const parsed = RegisterForEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = registerForEvent(eventId, parsed.data);
  if ("error" in result) {
    if (result.error === "event-not-found") {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    res.status(400).json({ error: "Cannot register for a completed or cancelled event" });
    return;
  }

  const { registration, event } = result;

  res.status(201).json({
    ...registration,
    event: GetEventResponse.parse(stripNullDates(event)),
  });

  void sendRsvpConfirmationEmail(event, registration);
});

router.delete("/registrations/:registrationId", async (req, res): Promise<void> => {
  const params = CancelRegistrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const updated = cancelRegistration(params.data.registrationId);

  if (!updated) {
    res.status(404).json({ error: "Registration not found or already cancelled" });
    return;
  }

  res.sendStatus(204);
});

export default router;
