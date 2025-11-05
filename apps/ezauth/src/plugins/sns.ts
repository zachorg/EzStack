import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import fp from "fastify-plugin";
import { EzAuthServiceConfig } from "../__generated__/configTypes";

export default fp(async (app: any) => {
  let snsClient: SNSClient | undefined;
  let isConfigured = false;

  // Check if AWS credentials are configured
  const awsAccessKey = process.env.FASTIFY_PUBLIC_AWS_ACCESS_KEY_ID;
  const awsSecretKey = process.env.FASTIFY_PUBLIC_AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.FASTIFY_PUBLIC_AWS_REGION;

  // Debug logging
  console.log("AWS Access Key:", awsAccessKey || "NOT SET");
  console.log("AWS Secret Key:", awsSecretKey || "NOT SET");
  console.log("AWS Region:", awsRegion || "NOT SET");

  if (awsAccessKey && awsSecretKey && awsRegion) {
    snsClient = new SNSClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
      },
    });
    isConfigured = true;
    app.log.info(
      `✅ AWS SNS Service initialized successfully (region: ${awsRegion})`
    );
  } else {
    app.log.warn("⚠️  AWS SNS not configured - missing environment variables");
    app.log.info(
      "💡 Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION (or FASTIFY_PUBLIC_AWS_* variants)"
    );
  }

  /**
   * Send OTP via SMS using AWS SNS
   */
  async function sendOtp(
    phoneNumber: string,
    otp: string,
    serviceInfo: EzAuthServiceConfig
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!isConfigured || !snsClient) {
      return {
        success: false,
        error:
          "AWS SNS not configured. Please set AWS credentials in environment variables.",
      };
    }

    // Format phone number for AWS SNS (ensure it starts with +)
    let formattedPhone = phoneNumber.trim();

    // Remove any non-digit characters except +
    formattedPhone = formattedPhone.replace(/[^\d+]/g, "");

    // If it doesn't start with +, assume US number and add +1
    if (!formattedPhone.startsWith("+")) {
      // Remove leading 1 if present
      if (formattedPhone.startsWith("1") && formattedPhone.length === 11) {
        formattedPhone = formattedPhone.substring(1);
      }
      formattedPhone = `+1${formattedPhone}`;
    }

    // Validate phone number format (should be +1XXXXXXXXXX for US)
    if (!/^\+1\d{10}$/.test(formattedPhone)) {
      return {
        success: false,
        error: `Invalid phone number format: ${phoneNumber}. Expected 10-digit US number or international format.`,
      };
    }

    // Create the SMS message
    const organizationName = serviceInfo.organization_name || "EzStack";
    const message = `Your ${
      organizationName
    } verification code is: ${otp}. Valid for ${Math.floor(serviceInfo.otp_ttl_seconds / 60)} minutes.`;

    app.log.info(`📱 [AWS SNS] Sending SMS to: ${formattedPhone}`);
    app.log.info(`📱 [AWS SNS] Message: ${message}`);

    const command = new PublishCommand({
      Message: message,
      PhoneNumber: formattedPhone,
      MessageAttributes: {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional", // Use Transactional for OTP (higher priority, lower cost)
        },
        "AWS.SNS.SMS.MaxPrice": {
          DataType: "String",
          StringValue: "0.01254", // Maximum price per SMS in USD
        },
      },
    });

    try {
      const response = await snsClient.send(command);

      app.log.info(`📱 [AWS SNS] SMS sent successfully to ${formattedPhone}`);
      app.log.info(`   Message ID: ${response.MessageId}`);

      return {
        success: true,
        messageId: response.MessageId || `aws_${Date.now()}`,
      };
    } catch (error: any) {
      app.log.error(
        "AWS SNS Error:",
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
      if (error.name === "InvalidParameterException") {
        return {
          success: false,
          error: `Invalid phone number format: ${phoneNumber}. Please use 10-digit US number or international format (e.g., +1234567890)`,
        };
      } else if (error.name === "AuthorizationErrorException") {
        return {
          success: false,
          error: "AWS credentials are invalid or expired",
        };
      } else if (error.name === "ThrottlingException") {
        return {
          success: false,
          error: "Rate limit exceeded. Please try again later",
        };
      } else if (error.name === "EndpointError") {
        return {
          success: false,
          error: "AWS SNS endpoint error. Check your region configuration.",
        };
      }

      return {
        success: false,
        error:
          error?.message ||
          error?.toString() ||
          "Failed to send SMS via AWS SNS",
      };
    }
  }

  /**
   * Check if the service is properly configured
   */
  function isReady(): boolean {
    return isConfigured;
  }

  /**
   * Get configuration status
   */
  function getStatus(): {
    configured: boolean;
    region?: string;
    hasCredentials: boolean;
  } {
    return {
      configured: isConfigured,
      region: awsRegion,
      hasCredentials: !!(awsAccessKey && awsSecretKey),
    };
  }

  // Register the SNS service with Fastify
  app.decorate("sns", {
    sendOtp,
    isReady,
    getStatus,
  });

  // Add health check endpoint for SNS status
  app.get("/health/sns", async (_request: any, reply: any) => {
    const status = getStatus();
    return reply.code(status.configured ? 200 : 503).send({
      service: "sns",
      ...status,
      ready: isReady(),
    });
  });
});
