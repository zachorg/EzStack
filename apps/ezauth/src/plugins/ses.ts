import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import fp from "fastify-plugin";
import { EzAuthServiceConfig } from "../__generated__/configTypes";

export default fp(async (app: any) => {
  let sesClient: SESClient | undefined;
  let isConfigured = false;

  // Check if AWS credentials are configured
  const awsAccessKey = process.env.FASTIFY_PUBLIC_AWS_ACCESS_KEY_ID;
  const awsSecretKey = process.env.FASTIFY_PUBLIC_AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.FASTIFY_PUBLIC_AWS_REGION;
  const fromEmail = process.env.FASTIFY_PUBLIC_AWS_SES_FROM_EMAIL || process.env.FASTIFY_PUBLIC_AWS_SES_FROM;

  // Debug logging
  console.log("AWS Access Key:", awsAccessKey ? "SET" : "NOT SET");
  console.log("AWS Secret Key:", awsSecretKey ? "SET" : "NOT SET");
  console.log("AWS Region:", awsRegion || "NOT SET");
  console.log("From Email:", fromEmail || "NOT SET");

  if (awsAccessKey && awsSecretKey && awsRegion) {
    sesClient = new SESClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
      },
    });
    isConfigured = true;
    app.log.info(
      `✅ AWS SES Service initialized successfully (region: ${awsRegion})`
    );
  } else {
    app.log.warn("⚠️  AWS SES not configured - missing environment variables");
    app.log.info(
      "💡 Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION (or FASTIFY_PUBLIC_AWS_* variants)"
    );
  }

  /**
   * Send OTP via Email using AWS SES
   */
  async function sendOtp(
    emailAddress: string,
    otp: string,
    serviceInfo: EzAuthServiceConfig
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!isConfigured || !sesClient) {
      return {
        success: false,
        error:
          "AWS SES not configured. Please set AWS credentials in environment variables.",
      };
    }

    if (!fromEmail) {
      return {
        success: false,
        error:
          "AWS SES 'from' email not configured. Please set FASTIFY_PUBLIC_AWS_SES_FROM_EMAIL environment variable.",
      };
    }

    // Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      return {
        success: false,
        error: `Invalid email address format: ${emailAddress}`,
      };
    }

    // Create the email content
    const organizationName = serviceInfo.organization_name.length > 0
      ? serviceInfo.organization_name
      : "EzAuth";
    
    const otpValidMinutes = Math.floor(serviceInfo.otp_ttl_seconds / 60);
    
    const subject = `Your ${organizationName} Verification Code`;
    
    const textBody = `Your ${organizationName} verification code is: ${otp}\n\nValid for ${otpValidMinutes} minutes.\n\nIf you didn't request this code, please ignore this email.`;
    
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
    <h2 style="color: #333; margin-top: 0;">Verification Code</h2>
    <p>Your ${organizationName} verification code is:</p>
    <div style="background-color: #fff; border: 2px dashed #007bff; border-radius: 5px; padding: 15px; text-align: center; margin: 20px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">${otp}</span>
    </div>
    <p style="color: #666; font-size: 14px;">Valid for ${otpValidMinutes} minutes.</p>
    <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">If you didn't request this code, please ignore this email.</p>
  </div>
</body>
</html>`;

    app.log.info(`📧 [AWS SES] Sending email to: ${emailAddress}`);
    app.log.info(`📧 [AWS SES] Subject: ${subject}`);

    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [emailAddress],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data: textBody,
            Charset: "UTF-8",
          },
          Html: {
            Data: htmlBody,
            Charset: "UTF-8",
          },
        },
      },
    });

    try {
      const response = await sesClient.send(command);

      app.log.info(`📧 [AWS SES] Email sent successfully to ${emailAddress}`);
      app.log.info(`   Message ID: ${response.MessageId}`);

      return {
        success: true,
        messageId: response.MessageId || `ses_${Date.now()}`,
      };
    } catch (error: any) {
      app.log.error(
        "AWS SES Error:",
        JSON.stringify({
          error: error?.toString(),
          message: error?.message,
          name: error?.name,
          code: error?.code,
          stack: error?.stack,
          type: typeof error,
          isNull: error === null,
          isUndefined: error === undefined,
        })
      );

      // Handle specific AWS errors
      if (error.name === "MessageRejected") {
        return {
          success: false,
          error: `Email rejected: ${error.message || "Invalid email address or sender not verified"}`,
        };
      } else if (error.name === "MailFromDomainNotVerifiedException") {
        return {
          success: false,
          error: "Sender email domain not verified in AWS SES",
        };
      } else if (error.name === "ConfigurationSetDoesNotExistException") {
        return {
          success: false,
          error: "AWS SES configuration set not found",
        };
      } else if (error.name === "AccountSendingPausedException") {
        return {
          success: false,
          error: "AWS SES account sending is paused",
        };
      } else if (error.name === "SendingPausedException") {
        return {
          success: false,
          error: "AWS SES sending is paused for this account",
        };
      } else if (error.name === "ThrottlingException") {
        return {
          success: false,
          error: "Rate limit exceeded. Please try again later",
        };
      } else if (error.name === "AuthorizationErrorException") {
        return {
          success: false,
          error: "AWS credentials are invalid or expired",
        };
      }

      return {
        success: false,
        error:
          error?.message ||
          error?.toString() ||
          "Failed to send email via AWS SES",
      };
    }
  }

  /**
   * Check if the service is properly configured
   */
  function isReady(): boolean {
    return isConfigured && !!fromEmail;
  }

  /**
   * Get configuration status
   */
  function getStatus(): {
    configured: boolean;
    region?: string;
    hasCredentials: boolean;
    fromEmail?: string;
  } {
    return {
      configured: isConfigured,
      region: awsRegion,
      hasCredentials: !!(awsAccessKey && awsSecretKey),
      fromEmail: fromEmail,
    };
  }

  // Register the SES service with Fastify
  app.decorate("ses", {
    sendOtp,
    isReady,
    getStatus,
  });

  // Add health check endpoint for SES status
  app.get("/health/ses", async (_request: any, reply: any) => {
    const status = getStatus();
    return reply.code(status.configured ? 200 : 503).send({
      service: "ses",
      ...status,
      ready: isReady(),
    });
  });
});
