export const sendSchema = {
    type: "object",
    required: ["destination", "channel"],
    additionalProperties: false,
    properties: {
        destination: { 
            type: "string", 
            minLength: 3,
            maxLength: 254
        },
        channel: { 
            type: "string", 
            enum: ["sms", "email"] 
        },
        contextDescription: { 
            type: "string" 
        }
    }
} as const;

export const sendHeadersSchema = {
    type: "object",
    additionalProperties: true,
    properties: {
        "api-key": {
            type: "string",
            minLength: 8,
            maxLength: 128
        }
    }
} as const;

const L_MIN = 4;
const L_MAX = 10;

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



