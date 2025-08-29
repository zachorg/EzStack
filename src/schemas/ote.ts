// Schema for issuing an OTE (email code). Supports optional idempotency and context IDs.
export const sendSchema = {
    type: "object",
    required: ["tenantId", "email"],
    additionalProperties: false,
    properties: {
        tenantId: { 
            type: "string", 
            minLength: 1 
        },
        email: { 
            type: "string", 
            format: "email"
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

// Optional headers for issuing an OTE. Supports Idempotency-Key header.
export const sendHeadersSchema = {
    type: "object",
    additionalProperties: true,
    properties: {
        "idempotency-key": {
            type: "string",
            minLength: 8,
            maxLength: 128
        }
    }
} as const;

const L_MIN = 4;
const L_MAX = 10;

// Schema for verifying an OTE. Code length matches configured OTE length.
export const verifySchema = {
    type: "object",
    required: ["tenantId", "requestId", "code"],
    additionalProperties: false,
    properties: {
        tenantId: { type: "string" },
        requestId: { type: "string" },
        code: { type: "string", minLength: L_MIN, maxLength: L_MAX }
    }
} as const;

// Schema for resending an OTE using an existing requestId.
export const resendSchema = {
    type: "object",
    required: ["tenantId", "requestId"],
    additionalProperties: false,
    properties: {
        tenantId: { type: "string" },
        requestId: { type: "string" }
    }
} as const;


