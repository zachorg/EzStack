"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSidebar } from "../../components/SidebarProvider";

type Language = "curl" | "python";

interface ApiEndpoint {
  id: string;
  name: string;
  method: string;
  path: string;
  description: string;
  auth: boolean;
  requestBody?: {
    [key: string]: {
      type: string;
      required: boolean;
      description: string;
    };
  };
  requestHeaders?: {
    [key: string]: {
      type: string;
      required: boolean;
      description: string;
    };
  };
  response: {
    [key: string]: string;
  };
  examples: {
    curl: string;
    python: string;
  };
  responseExample: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  comingSoon?: boolean;
  endpoints: ApiEndpoint[];
}

const PRODUCTS: Product[] = [
  {
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
            description: "Bearer token from Firebase Authentication"
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
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "destination": "1234567890",
    "channel": "sms",
    "contextDescription": "Login verification"
  }'`,
          python: `import requests

url = "https://api.ezstack.app/ezauth/otp/send"
headers = {
    "Authorization": "Bearer YOUR_FIREBASE_TOKEN",
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
            description: "Bearer token from Firebase Authentication"
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
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "requestId": "req_abc123xyz",
    "code": "123456"
  }'`,
          python: `import requests

url = "https://api.ezstack.app/ezauth/otp/verify"
headers = {
    "Authorization": "Bearer YOUR_FIREBASE_TOKEN",
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
            description: "API key for authentication"
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
            description: "API key for authentication"
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
            description: "API key for authentication"
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
  },
  {
    id: "ezsms",
    name: "EzSms",
    description: "Simple SMS messaging service (Coming Soon)",
    baseUrl: "https://api.ezstack.app/ezsms",
    comingSoon: true,
    endpoints: []
  }
];

function CodeExample({ code, responseExample, endpointId, method, path }: { code: { curl: string; python: string }, responseExample: string, endpointId: string, method: string, path: string }) {
  const [language, setLanguage] = useState<Language>("curl");

  return (
    <div className="space-y-3">
      {/* Request Example */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#0F0F0F', border: '0.5px solid #2A2A2A' }}>
        <div className="flex justify-between items-center px-4 py-2" style={{ background: '#141414', borderBottom: '0.5px solid #2A2A2A' }}>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              method === "POST"
                ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                : "bg-gray-700 text-gray-300 border border-gray-700"
            }`}>
              {method}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              {path}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setLanguage("curl")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                language === "curl"
                  ? "bg-green-600/20 text-green-400 border border-green-600/30"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              </svg>
              cURL
            </button>
            <button
              onClick={() => setLanguage("python")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                language === "python"
                  ? "bg-green-600/20 text-green-400 border border-green-600/30"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
              Python
            </button>
          </div>
        </div>
        <pre className="p-4 overflow-x-auto text-xs leading-relaxed">
          <code className="text-gray-300">
            {code[language]}
          </code>
        </pre>
      </div>

      {/* Response Example */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#0F0F0F', border: '0.5px solid #2A2A2A' }}>
        <div className="flex justify-between items-center px-4 py-2" style={{ background: '#141414', borderBottom: '0.5px solid #2A2A2A' }}>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-600/20 text-green-400 border border-green-600/30">
              200
            </span>
            <span className="text-xs text-gray-400">Successful</span>
          </div>
          <button className="text-gray-400 hover:text-gray-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <pre className="p-4 overflow-x-auto text-xs leading-relaxed">
          <code className="text-gray-300">
            {responseExample}
          </code>
        </pre>
      </div>
    </div>
  );
}

export default function DocsPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("otp-send");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set(["ezauth"]));
  const { setSections } = useSidebar();

  const toggleProduct = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  // Find current endpoint
  const currentEndpoint = PRODUCTS.flatMap(p => p.endpoints).find(e => e.id === selectedEndpoint);
  const currentProduct = PRODUCTS.find(p => p.endpoints.some(e => e.id === selectedEndpoint));

  // Set sidebar sections for docs page
  useEffect(() => {
    const docsSections = [
      {
        title: "",
        items: [
          {
            id: "home",
            name: "Home",
            href: "/",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            ),
          },
          {
            id: "docs",
            name: "Docs",
            href: "/docs",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ),
          }
        ],
      },
    ];
    
    setSections(docsSections);
  }, [setSections]);

  return (
    <div className="min-h-screen flex" style={{ paddingTop: '47px' }}>
      {/* Tree Navigation Sidebar */}
      <div className="w-64 border-r p-4 overflow-y-auto fixed left-12 top-[47px] bottom-0" style={{ borderColor: '#1F1F1F', background: '#0F0F0F' }}>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">API Documentation</h2>
        
        <div className="space-y-1">
          {/* Products - Top Level */}
          {PRODUCTS.map((product) => (
            <div key={product.id}>
              {/* Product Name */}
              <button
                onClick={() => !product.comingSoon && toggleProduct(product.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors ${
                  product.comingSoon
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
                disabled={product.comingSoon}
              >
                <span className="flex items-center gap-2">
                  {!product.comingSoon && (
                    <svg
                      className={`w-3 h-3 transition-transform ${
                        expandedProducts.has(product.id) ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {product.name}
                </span>
                {product.comingSoon && (
                  <span className="text-xs text-gray-600">Soon</span>
                )}
              </button>
              
              {/* Endpoints */}
              {expandedProducts.has(product.id) && !product.comingSoon && (
                <div className="ml-5 mt-1 space-y-0.5 border-l border-gray-800">
                  {product.endpoints.map((endpoint) => (
                    <button
                      key={endpoint.id}
                      onClick={() => setSelectedEndpoint(endpoint.id)}
                      className={`w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center gap-2 ${
                        selectedEndpoint === endpoint.id
                          ? "text-gray-100 bg-gray-800 border-l-2 border-gray-400 -ml-px"
                          : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                      }`}
                    >
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                            endpoint.method === "POST"
                              ? "bg-blue-600/20 text-blue-400"
                              : "bg-gray-700 text-gray-300"
                          }`}>
                        {endpoint.method}
                      </span>
                      {endpoint.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto ml-64 min-h-screen" style={{ background: '#0D0D0D' }}>
        <div className="max-w-[1400px] mx-auto px-12 py-6">
          {currentEndpoint && currentProduct ? (
            <div className="space-y-6">
              {/* Breadcrumb and Title */}
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <span className="text-gray-400">{currentProduct.name}</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-100 mb-3">{currentEndpoint.name}</h1>
                <div className="flex items-center gap-3 p-3 rounded-lg font-mono" style={{ background: '#141414', border: '0.5px solid #2A2A2A' }}>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    currentEndpoint.method === "POST"
                      ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                      : "bg-gray-700 text-gray-300 border border-gray-700"
                  }`}>
                    {currentEndpoint.method}
                  </span>
                  <code className="text-sm text-gray-300">{currentProduct.baseUrl}{currentEndpoint.path}</code>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-400">{currentEndpoint.description}</p>

              {/* Two Column Layout */}
              <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
                {/* Left Column - Request Details */}
                <div className="space-y-6">
                  {/* Request Headers */}
                  {currentEndpoint.requestHeaders && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Headers</h3>
                      <div className="space-y-4">
                        {Object.entries(currentEndpoint.requestHeaders).map(([key, value]) => (
                          <div key={key} className="pb-3" style={{ borderBottom: '1px solid #1F1F1F' }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium text-sm">{key}</span>
                              <span className="text-xs text-gray-500">{value.type}</span>
                              {value.required && (
                                <span className="text-xs text-red-300">Required</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">{value.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Body */}
                  {currentEndpoint.requestBody && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Body</h3>
                      <p className="text-sm text-gray-400 mb-4">This endpoint expects an object.</p>
                      <div className="space-y-4">
                        {Object.entries(currentEndpoint.requestBody).map(([key, value]) => (
                          <div key={key} className="pb-3" style={{ borderBottom: '1px solid #1F1F1F' }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium text-sm">{key}</span>
                              <span className="text-xs text-gray-500">{value.type}</span>
                              {value.required && (
                                <span className="text-xs text-red-300">Required</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">{value.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Code Examples */}
                <div>
                  <CodeExample 
                    code={currentEndpoint.examples} 
                    responseExample={currentEndpoint.responseExample}
                    endpointId={currentEndpoint.id}
                    method={currentEndpoint.method}
                    path={currentEndpoint.path}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <h2 className="text-2xl font-semibold text-gray-400 mb-4">Select an endpoint to view details</h2>
              <p className="text-gray-500">Choose an API endpoint from the navigation on the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
