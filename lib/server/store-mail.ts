import nodemailer from "nodemailer";

type StoreMail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
};

export function isStoreMailConfigured() {
  return Boolean(
    process.env.UNDERBEACH_SMTP_HOST &&
    process.env.UNDERBEACH_SMTP_PORT &&
    process.env.UNDERBEACH_SMTP_USER &&
    process.env.UNDERBEACH_SMTP_PASSWORD
  );
}

export async function sendStoreMail(message: StoreMail) {
  const host = process.env.UNDERBEACH_SMTP_HOST;
  const port = Number(process.env.UNDERBEACH_SMTP_PORT || 465);
  const user = process.env.UNDERBEACH_SMTP_USER;
  const pass = process.env.UNDERBEACH_SMTP_PASSWORD;

  if (!host || !user || !pass || !Number.isInteger(port)) {
    throw new Error("SMTP Aruba non configurato.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  return transporter.sendMail({
    from: process.env.UNDERBEACH_SMTP_FROM || `Underbeach <${user}>`,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    replyTo: message.replyTo || undefined,
  });
}
