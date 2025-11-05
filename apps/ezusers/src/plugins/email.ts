import fp from "fastify-plugin";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export default fp(async (app) => {
  const fromDefault = process.env.EMAIL_FROM;
  const dryRun = String(process.env.EMAIL_DRY_RUN || "").toLowerCase() === "true"
    || (!process.env.FASTIFY_PUBLIC_AWS_ACCESS_KEY_ID && !process.env.FASTIFY_PUBLIC_AWS_SECRET_ACCESS_KEY && !process.env.AWS_SES_ENDPOINT);

  if (dryRun) {
    app.log.warn({ dryRun: true }, "Email dry-run mode: emails will not be sent");
    app.decorate(
      "sendEmail",
      async ({ to, from, subject }: { to: string; from?: string; subject: string }) => {
        const Source = (from || fromDefault) || "(unset)";
        app.log.info({ to, from: Source, subject }, "[dry-run] sendEmail");
      }
    );
    return;
  }

  const region = process.env.FASTIFY_PUBLIC_AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  const ses = new SESClient({
    region,
    endpoint: process.env.AWS_SES_ENDPOINT || undefined
  });
  app.log.info({ region, endpoint: process.env.AWS_SES_ENDPOINT ? true : false }, "SES client initialized");

  app.decorate(
    "sendEmail",
    async ({ to, from, subject, text, html }: { to: string; from?: string; subject: string; text?: string; html?: string }) => {
      const Source = (from || fromDefault);
      if (!Source) {
        throw new Error("EMAIL_FROM not configured");
      }

      const cmd = new SendEmailCommand({
        Source,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: html ? { Html: { Data: html }, Text: text ? { Data: text } : undefined } : { Text: { Data: text || "" } }
        }
      });

      try {
        await ses.send(cmd);
        app.log.info({ to, from: Source }, "SES email sent");
      } catch (err) {
        app.log.error({ err, to, from: Source }, "SES send failed");
        throw err;
      }
    }
  );
});



