import { Product } from "../types";

export const ezAuthProduct: Product = {
  id: "ezauth",
  name: "EzAuth",
  description: "One-Time Passwords (OTP) via SMS with built-in rate limiting.",
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
    }
  ]
};

