import cron from "node-cron";

function getApiBaseUrl(): string {
  return process.env.API_BASE_URL?.trim() || "http://localhost:3001";
}

function getReminderSecretHeader(): Record<string, string> {
  const secret = process.env.REMINDER_CRON_SECRET?.trim();
  if (!secret) return {};
  return { "x-reminder-secret": secret };
}

async function runReminderSweep(): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/notifications/reminders/run`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...getReminderSecretHeader(),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.error || `Reminder sweep failed with status ${response.status}`);
  }

  console.log("Reminder sweep completed:", JSON.stringify(payload, null, 2));
}

async function main(): Promise<void> {
  const watchMode = process.argv.includes("--watch");

  if (!watchMode) {
    await runReminderSweep();
    return;
  }

  console.log("Reminder cron is running every 30 minutes...");
  await runReminderSweep();

  cron.schedule("*/30 * * * *", () => {
    void runReminderSweep().catch((error) => {
      console.error("Scheduled reminder run failed:", error);
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
