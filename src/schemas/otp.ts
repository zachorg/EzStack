// Schema for issuing an OTP. Supports optional idempotency and context IDs.
export const sendSchema = {
    type: "object",
    required: ["tenantId", "destination", "channel"],
    additionalProperties: false,
    properties: {
        tenantId: { 
            type: "string", 
            minLength: 1 
        },
        destination: { 
            type: "string", 
            minLength: 3 
        },
        channel: { 
            type: "string", 
            enum: ["sms", "email"] 
        },
        idempotencyKey: { 
            type: "string", 
            minLength: 8, 
            maxLength: 128 
        },
        contextId: { 
            type: "string" 
        }
    }
} as const;

// Optional headers for issuing an OTP. Supports Idempotency-Key header.
export const sendHeadersSchema = {
    type: "object",
    // Allow other headers like content-type and auth
    additionalProperties: true,
    properties: {
        // Fastify lowercases header keys
        "idempotency-key": {
            type: "string",
            minLength: 8,
            maxLength: 128
        }
    }
} as const;

const L = Number(process.env.OTP_LENGTH || 6);

// Schema for verifying an OTP. Code length matches configured OTP length.
export const verifySchema = {
    type: "object",
    required: ["tenantId", "requestId", "code"],
    additionalProperties: false,
    properties: {
        tenantId: { 
            type: "string" 
        },
        requestId: { 
            type: "string" 
        },
        code: { 
            type: "string", 
            minLength: L, 
            maxLength: L 
        }
    }
} as const;

// Schema for resending an OTP using an existing requestId.
export const resendSchema = {
    type: "object",
    required: ["tenantId", "requestId"],
    additionalProperties: false,
    properties: {
        tenantId: { 
            type: "string" 
        },
        requestId: { 
            type: "string" 
        }
    }
} as const;