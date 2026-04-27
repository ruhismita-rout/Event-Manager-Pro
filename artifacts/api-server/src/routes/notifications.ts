import { Router, type IRouter } from "express";
import { markNotificationsUnsubscribed } from "../lib/store";
import { parseUnsubscribeToken } from "../lib/notifications/tokens";
import { runReminderSweep } from "../lib/notifications/service";

const router: IRouter = Router();

router.get("/notifications/unsubscribe", async (req, res): Promise<void> => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    res.status(400).send("<h1>Invalid unsubscribe link</h1>");
    return;
  }

  const parsed = parseUnsubscribeToken(token);
  if (!parsed) {
    res.status(400).send("<h1>Invalid or expired unsubscribe token</h1>");
    return;
  }

  markNotificationsUnsubscribed(parsed.eventId, parsed.userEmail);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html>
<html>
  <body style="font-family:system-ui,Arial,sans-serif;background:#FEFCE8;padding:24px;color:#0A0A0A;">
    <div style="max-width:620px;margin:0 auto;background:#fff;border:2px solid #0A0A0A;box-shadow:4px 4px 0 #0A0A0A;padding:32px;">
      <h1 style="margin:0 0 12px;">You've been unsubscribed</h1>
      <p style="margin:0;line-height:1.6;">You will no longer receive reminder emails for this event.</p>
    </div>
  </body>
</html>`);
});

router.post("/notifications/reminders/run", async (req, res): Promise<void> => {
  const configuredSecret = process.env.REMINDER_CRON_SECRET?.trim();
  if (configuredSecret) {
    const providedSecret = req.header("x-reminder-secret");
    if (providedSecret !== configuredSecret) {
      res.status(403).json({ error: "Invalid reminder secret" });
      return;
    }
  }

  const result = await runReminderSweep();
  res.json(result);
});

export default router;
