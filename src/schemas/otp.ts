// Schema for issuing an OTP. Supports optional idempotency and context IDs.
export const sendSchema = {
    type: "object",
    required: ["destination", "channel"],
    additionalProperties: false,
    properties: {
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

const L_MIN = 4;
const L_MAX = 10;

// Schema for verifying an OTP. Code length matches configured OTP length.
export const verifySchema = {
    type: "object",
    required: ["requestId", "code"],
    additionalProperties: false,
    properties: {
        requestId: { 
            type: "string" 
        },
        code: { 
            type: "string", 
            minLength: L_MIN, 
            maxLength: L_MAX 
        }
    }
} as const;

// Schema for resending an OTP using an existing requestId.
export const resendSchema = {
    type: "object",
    required: ["requestId"],
    additionalProperties: false,
    properties: {
        requestId: { 
            type: "string" 
        }
    }
} as const;