import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import fp from "fastify-plugin";
import {
  EzAuthEmailThemeConfig,
  EzAuthServiceConfig,
} from "../__generated__/configTypes";

export default fp(async (app: any) => {
  let sesClient: SESClient | undefined;
  let isConfigured = false;

  // Check if AWS credentials are configured
  const awsAccessKey = process.env.FASTIFY_PUBLIC_AWS_ACCESS_KEY_ID;
  const awsSecretKey = process.env.FASTIFY_PUBLIC_AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.FASTIFY_PUBLIC_AWS_REGION;
  const fromEmail =
    process.env.FASTIFY_PUBLIC_AWS_SES_FROM_EMAIL ||
    process.env.FASTIFY_PUBLIC_AWS_SES_FROM;

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
   * Get email theme colors based on theme name
   */

  function getEmailTheme(themeName: string): EzAuthEmailThemeConfig {
    const normalizedTheme = themeName.toLowerCase();

    switch (normalizedTheme) {
      case "light":
        return {
          bodyBg: "#F5F5F5",
          containerBg: "#FFFFFF",
          containerBorder: "#E5E7EB",
          headerBg: "#3B82F6",
          textPrimary: "#1F2937",
          textSecondary: "#6B7280",
          textMuted: "#9CA3AF",
          accentPrimary: "#3B82F6",
          codeBoxBg: "#F0F7FF",
          codeBoxBorder: "#3B82F6",
          timerBoxBg: "#F9FAFB",
          timerBoxBorder: "#E5E7EB",
          footerBg: "#F9FAFB",
          footerBorder: "#E5E7EB",
        };

      case "vibrant":
        return {
          bodyBg: "#1A0033",
          containerBg: "#2D1B4E",
          containerBorder: "#6B46C1",
          headerBg:
            "linear-gradient(135deg, #9333EA 0%, #EC4899 50%, #F59E0B 100%)",
          textPrimary: "#FFFFFF",
          textSecondary: "#E9D5FF",
          textMuted: "#A78BFA",
          accentPrimary: "#F59E0B",
          codeBoxBg: "#4C1D95",
          codeBoxBorder: "#A855F7",
          timerBoxBg: "#4C1D95",
          timerBoxBorder: "#7C3AED",
          footerBg: "#2D1B4E",
          footerBorder: "#6B46C1",
        };

      case "dark":
      default:
        return {
          bodyBg: "#0D0D0D",
          containerBg: "#141414",
          containerBorder: "#262626",
          headerBg: "#3B82F6",
          textPrimary: "#EAEAEA",
          textSecondary: "#A1A1A1",
          textMuted: "#5A5A5A",
          accentPrimary: "#3B82F6",
          codeBoxBg: "#1A1A1A",
          codeBoxBorder: "#3B82F6",
          timerBoxBg: "#1A1A1A",
          timerBoxBorder: "#262626",
          footerBg: "#141414",
          footerBorder: "#262626",
        };
    }
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
    const organizationName =
      serviceInfo.organization_name.length > 0
        ? serviceInfo.organization_name
        : "EzAuth";

    const otpValidMinutes = Math.floor(serviceInfo.otp_ttl_seconds / 60);

    const subject = `Your ${organizationName} Verification Code`;

    const textBody = `Your ${organizationName} verification code is: ${otp}\n\nValid for ${otpValidMinutes} minutes.\n\nIf you didn't request this code, please ignore this email.`;

    // Get email theme from serviceInfo, default to "dark"
    const emailTheme = serviceInfo.email_theme || "vibrant";
    let theme = getEmailTheme(emailTheme);
    if (emailTheme === "custom") {
      theme = {
        ...theme,
        ...(serviceInfo.email_theme_config as EzAuthEmailThemeConfig),
      };
    }

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; width: 100% !important; min-width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${
      theme.bodyBg
    };">
  <!-- Background table -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; width: 100%; background-color: ${
    theme.bodyBg
  };">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main container table -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: ${
          theme.containerBg
        }; border: 1px solid ${
      theme.containerBorder
    }; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="${
              theme.headerBg.startsWith("linear-gradient")
                ? `background: ${theme.headerBg}`
                : `background-color: ${theme.headerBg}`
            }; padding: 32px 40px; text-align: center;">
              <!--[if mso]>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="${
                    theme.headerBg.startsWith("linear-gradient")
                      ? `background-color: #9333EA`
                      : `background-color: ${theme.headerBg}`
                  }; padding: 32px 40px;">
              <![endif]-->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: ${
                      theme.textPrimary
                    }; letter-spacing: -0.5px; text-align: center;">
                      ${organizationName}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 8px;">
                    <p style="margin: 0; font-size: 16px; color: ${
                      theme.textPrimary
                    }; font-weight: 400; opacity: 0.9;">
                      Verification Code
                    </p>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
                  </td>
                </tr>
              </table>
              <![endif]-->
            </td>
          </tr>
          
          <!-- Content area -->
          <tr>
            <td style="padding: 40px; background-color: ${theme.containerBg};">
              <!-- Intro text -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${
                      theme.textPrimary
                    }; font-weight: 400;">
                      Hello,
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${
                      theme.textSecondary
                    };">
                      Your verification code is below. Enter it in your open browser window.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- OTP Code Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: ${
                      theme.codeBoxBg
                    }; border: 2px solid ${
      theme.codeBoxBorder
    }; border-radius: 12px; width: 100%; max-width: 400px;">
                      <tr>
                        <td align="center" style="padding: 32px 24px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td align="center" style="padding-bottom: 12px;">
                                <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${
                                  theme.accentPrimary
                                }; text-transform: uppercase; letter-spacing: 1px;">
                                  Your Code
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td align="center">
                                <p style="margin: 0; font-size: 40px; font-weight: 700; letter-spacing: 8px; color: ${
                                  theme.accentPrimary
                                }; font-family: 'Courier New', Courier, monospace; line-height: 1.2; text-align: center;">
                                  ${otp}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Timer info -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: ${
                      theme.timerBoxBg
                    }; border: 1px solid ${
      theme.timerBoxBorder
    }; border-radius: 8px; width: 100%; max-width: 400px;">
                      <tr>
                        <td align="center" style="padding: 16px 24px;">
                          <p style="margin: 0; font-size: 14px; color: ${
                            theme.textSecondary
                          }; line-height: 1.5;">
                            <span style="font-weight: 600; color: ${
                              theme.textPrimary
                            };">⏱ Valid for ${otpValidMinutes} minutes</span><br>
                            <span style="font-size: 13px; color: ${
                              theme.textSecondary
                            };">This code will expire soon for security reasons.</span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Additional info -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${
                      theme.textSecondary
                    };">
                      If you didn't request this code, you can safely ignore this email. Someone else may have typed your email address by mistake.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: ${
              theme.footerBg
            }; border-top: 1px solid ${theme.footerBorder};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <p style="margin: 0; font-size: 12px; color: ${
                      theme.textSecondary
                    }; line-height: 1.5;">
                      Powered by <span style="color: ${
                        theme.accentPrimary
                      }; font-weight: 600;">EzStack</span>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 11px; color: ${
                      theme.textMuted
                    };">
                      This is an automated message, please do not reply.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- Spacer for mobile -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px 0;">
              <p style="margin: 0; font-size: 12px; color: ${
                theme.bodyBg
              }; text-align: center; line-height: 1.5;">
                &nbsp;
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
          error: `Email rejected: ${
            error.message || "Invalid email address or sender not verified"
          }`,
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
