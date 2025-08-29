import fp from "fastify-plugin";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export default fp(async (app) => {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  const fromDefault = process.env.EMAIL_FROM;

  const ses = new SESClient({
    region,
    // Allow localstack or custom endpoint via env if present
    endpoint: process.env.AWS_SES_ENDPOINT || undefined
  });

  app.decorate(
    "sendEmail",
    async ({ to, from, subject, text, html }: { to: string; from?: string; subject: string; text?: string; html?: string }) => {
      const Source = (from || fromDefault);
      if (!Source) {
        throw new Error("EMAIL_FROM not configured");
      }

      // Build minimal SES send request
      const cmd = new SendEmailCommand({
        Source,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: html ? { Html: { Data: html }, Text: text ? { Data: text } : undefined } : { Text: { Data: text || "" } }
        }
      });

      await ses.send(cmd);
    }
  );
});


