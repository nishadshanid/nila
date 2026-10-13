import "server-only";
import { clean } from "@/lib/clean-env";
import nodemailer, { type Transporter } from "nodemailer";
import type { Email } from "@/lib/email-templates";

export type SendEmail = (to: string, email: Email) => Promise<void>;

const gmailUser = () => clean(process.env.GMAIL_USER);
// Google shows app passwords in groups of four ("abcd efgh …"); the spaces aren't part of it.
const gmailPassword = () => clean(process.env.GMAIL_APP_PASSWORD).replace(/\s+/g, "");

/** Whether Gmail sending is set up (GMAIL_USER and GMAIL_APP_PASSWORD). */
export function emailConfigured() {
  return Boolean(gmailUser() && gmailPassword());
}

/** The app's public address for links in emails, without a trailing slash. */
export function appUrl(): string | null {
  return clean(process.env.APP_URL).replace(/\/+$/, "") || null;
}

let transport: Transporter | null = null;

/** Sends through Gmail SMTP with an app password (free, ~500 emails a day). */
export const sendEmail: SendEmail = async (to, email) => {
  if (!emailConfigured()) throw new Error("Email isn't set up (GMAIL_USER / GMAIL_APP_PASSWORD)");
  transport ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmailUser(), pass: gmailPassword() },
  });
  await transport.sendMail({
    from: { name: "Nila", address: gmailUser() },
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
};
