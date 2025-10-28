import { Product } from "../types";

export const ezAuthProduct: Product = {
  id: "ezauth",
  name: "EzAuth",
  description: "One-Time Passwords (OTP) and One-Time Email codes (OTE) with built-in rate limiting and idempotent sends.",
  baseUrl: "https://api.ezstack.app/ezauth",
  endpoints: [
    {
      id: "otp-send",
      name: "Send OTP",
      method: "POST",
      path: "/otp/send",
      description: "Send a one-time password via SMS to a phone number.",
      auth: true,
      requestHeaders: {
        "Authorization": {
          type: "string",
          required: true,
          description: "API key from your EzStack account"
        },
        "Content-Type": {
          type: "string",
          required: true,
          description: "application/json"
        }
      },
      requestBody: {
        destination: {
          type: "string",
          required: true,
          description: "10-digit phone number (US format)"
        },
        channel: {
          type: "string",
          required: true,
          description: "Must be 'sms' or 'email'"
        },
        contextDescription: {
          type: "string",
          required: false,
          description: "Optional context for this request"
        }
      },
      response: {
        requestId: "string - Unique identifier for this OTP request"
      },
      examples: {
        curl: `curl -X POST https://api.ezstack.app/ezauth/otp/send \\
  -H "Authorization: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "destination": "1234567890",
    "channel": "sms",
    "contextDescription": "Login verification"
  }'`,
        python: `import requests

url = "https://api.ezstack.app/ezauth/otp/send"
headers = {
    "Authorization": "YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "destination": "1234567890",
    "channel": "sms",
    "contextDescription": "Login verification"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())`
      },
      responseExample: `{
  "requestId": "req_a3f8b2c1d5e9"
}`
    },
    {
      id: "otp-verify",
      name: "Verify OTP",
      method: "POST",
      path: "/otp/verify",
      description: "Verify a previously sent OTP code.",
      auth: true,
      requestHeaders: {
        "Authorization": {
          type: "string",
          required: true,
          description: "API key from your EzStack account"
        },
        "Content-Type": {
          type: "string",
          required: true,
          description: "application/json"
        }
      },
      requestBody: {
        requestId: {
          type: "string",
          required: true,
          description: "Request ID from the /send response"
        },
        code: {
          type: "string",
          required: true,
          description: "4-10 digit code provided by the user"
        }
      },
      response: {
        verified: "boolean - True if code is correct and not expired"
      },
      examples: {
        curl: `curl -X POST https://api.ezstack.app/ezauth/otp/verify \\
  -H "Authorization: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "requestId": "req_abc123xyz",
    "code": "123456"
  }'`,
        python: `import requests

url = "https://api.ezstack.app/ezauth/otp/verify"
headers = {
    "Authorization": "YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "requestId": "req_abc123xyz",
    "code": "123456"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())`
      },
      responseExample: `{
  "verified": true
}`
    },
    {
      id: "ote-send",
      name: "Send OTE",
      method: "POST",
      path: "/ote/send",
      description: "Send a one-time email code with idempotency support.",
      auth: true,
      requestHeaders: {
        "Authorization": {
          type: "string",
          required: true,
          description: "API key from your EzStack account"
        },
        "Content-Type": {
          type: "string",
          required: true,
          description: "application/json"
        },
        "Idempotency-Key": {
          type: "string",
          required: false,
          description: "Optional idempotency key (8-128 chars)"
        }
      },
      requestBody: {
        email: {
          type: "string",
          required: true,
          description: "Email address to send code to"
        },
        idempotencyKey: {
          type: "string",
          required: false,
          description: "Alternative to header (8-128 chars)"
        },
        contextId: {
          type: "string",
          required: false,
          description: "Optional context identifier"
        }
      },
      response: {
        requestId: "string - Unique identifier for this OTE request"
      },
      examples: {
        curl: `curl -X POST https://api.ezstack.app/ezauth/ote/send \\
  -H "Authorization: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: unique-key-123" \\
  -d '{
    "email": "user@example.com",
    "contextId": "signup-flow"
  }'`,
        python: `import requests

url = "https://api.ezstack.app/ezauth/ote/send"
headers = {
    "Authorization": "YOUR_API_KEY",
    "Content-Type": "application/json",
    "Idempotency-Key": "unique-key-123"
}
data = {
    "email": "user@example.com",
    "contextId": "signup-flow"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())`
      },
      responseExample: `{
  "requestId": "req_e7d4a9b2c8f1"
}`
    },
    {
      id: "ote-verify",
      name: "Verify OTE",
      method: "POST",
      path: "/ote/verify",
      description: "Verify a previously sent OTE code.",
      auth: true,
      requestHeaders: {
        "Authorization": {
          type: "string",
          required: true,
          description: "API key from your EzStack account"
        },
        "Content-Type": {
          type: "string",
          required: true,
          description: "application/json"
        }
      },
      requestBody: {
        requestId: {
          type: "string",
          required: true,
          description: "Request ID from the /send response"
        },
        code: {
          type: "string",
          required: true,
          description: "4-10 character code provided by the user"
        }
      },
      response: {
        verified: "boolean - True if code is correct and not expired"
      },
      examples: {
        curl: `curl -X POST https://api.ezstack.app/ezauth/ote/verify \\
  -H "Authorization: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "requestId": "req_abc123xyz",
    "code": "AB12CD"
  }'`,
        python: `import requests

url = "https://api.ezstack.app/ezauth/ote/verify"
headers = {
    "Authorization": "YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "requestId": "req_abc123xyz",
    "code": "AB12CD"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())`
      },
      responseExample: `{
  "verified": true
}`
    },
    {
      id: "ote-resend",
      name: "Resend OTE",
      method: "POST",
      path: "/ote/resend",
      description: "Resend an OTE code for an existing request. Subject to cooldown limits.",
      auth: true,
      requestHeaders: {
        "Authorization": {
          type: "string",
          required: true,
          description: "API key from your EzStack account"
        },
        "Content-Type": {
          type: "string",
          required: true,
          description: "application/json"
        }
      },
      requestBody: {
        requestId: {
          type: "string",
          required: true,
          description: "Request ID from the original /send response"
        }
      },
      response: {
        ok: "boolean - True if resend was successful"
      },
      examples: {
        curl: `curl -X POST https://api.ezstack.app/ezauth/ote/resend \\
  -H "Authorization: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "requestId": "req_abc123xyz"
  }'`,
        python: `import requests

url = "https://api.ezstack.app/ezauth/ote/resend"
headers = {
    "Authorization": "YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "requestId": "req_abc123xyz"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())`
      },
      responseExample: `{
  "ok": true
}`
    }
  ]
};

