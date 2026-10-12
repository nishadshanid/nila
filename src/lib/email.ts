import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { Email } from "@/lib/email-templates";

export type SendEmail = (to: string, email: Email) => Promise<void>;

/** Whether Gmail sending is set up (GMAIL_USER and GMAIL_APP_PASSWORD). */
export function emailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/** The app's public address for links in emails, without a trailing slash. */
export function appUrl(): string | null {
  return process.env.APP_URL?.replace(/\/+$/, "") || null;
}

let transport: Transporter | null = null;

/** Sends through Gmail SMTP with an app password (free, ~500 emails a day). */
export const sendEmail: SendEmail = async (to, email) => {
  if (!emailConfigured()) throw new Error("Email isn't set up (GMAIL_USER / GMAIL_APP_PASSWORD)");
  transport ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transport.sendMail({
    from: { name: "Nila", address: process.env.GMAIL_USER! },
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
};
