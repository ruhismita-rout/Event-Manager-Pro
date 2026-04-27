import { Resend } from "resend";
import { logger } from "../logger";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult = {
  ok: boolean;
  status: "sent" | "failed";
  providerId?: string;
  error?: string;
};

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

const resend = getResendClient();
const from = process.env.RESEND_FROM_EMAIL?.trim() || "EventFlow <onboarding@resend.dev>";

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!resend) {
    logger.warn({ to: input.to, subject: input.subject }, "RESEND_API_KEY missing; email skipped");
    return {
      ok: false,
      status: "failed",
      error: "RESEND_API_KEY is not configured",
    };
  }

  try {
    const response = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (response.error) {
      return {
        ok: false,
        status: "failed",
        error: response.error.message,
      };
    }

    return {
      ok: true,
      status: "sent",
      providerId: response.data?.id,
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown email delivery error",
    };
  }
}
