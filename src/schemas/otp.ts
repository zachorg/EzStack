export const sendSchema = {
    type: "object",
    required: ["tenantId", "destination", "channel"],
    additionalProperties: false,
    properties: {
      tenantId: { type: "string", minLength: 1 },
      destination: { type: "string", minLength: 3 },
      channel: { type: "string", enum: ["sms", "email"] },
      idempotencyKey: { type: "string", minLength: 8, maxLength: 128 },
      contextId: { type: "string" }
    }
  } as const;
  
  const L = Number(process.env.OTP_LENGTH || 6);
  export const verifySchema = {
    type: "object", required: ["tenantId", "requestId", "code"],
    additionalProperties: false,
    properties: { tenantId: { type: "string" }, requestId: { type: "string" }, code: { type: "string", minLength: L, maxLength: L } }
  } as const;
  
  export const resendSchema = {
    type: "object", required: ["tenantId", "requestId"],
    additionalProperties: false,
    properties: { tenantId: { type: "string" }, requestId: { type: "string" } }
  } as const;  