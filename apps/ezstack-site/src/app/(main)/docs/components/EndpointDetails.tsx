"use client";

import { ApiEndpoint, Product } from "../types";
import { CodeExample } from "./CodeExample";

interface EndpointDetailsProps {
  endpoint: ApiEndpoint;
  product: Product;
}

export function EndpointDetails({ endpoint, product }: EndpointDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Breadcrumb and Title */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-sm">
          <span className="text-gray-400">{product.name}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-100 mb-3">{endpoint.name}</h1>
        <div className="flex items-center gap-3 p-3 rounded-lg font-mono" style={{ background: '#141414', border: '0.5px solid #2A2A2A' }}>
          <span className={`px-2 py-1 rounded text-xs font-bold ${
            endpoint.method === "POST"
              ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
              : "bg-gray-700 text-gray-300 border border-gray-700"
          }`}>
            {endpoint.method}
          </span>
          <code className="text-sm text-gray-300">{product.baseUrl}{endpoint.path}</code>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-400">{endpoint.description}</p>

      {/* Two Column Layout */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
        {/* Left Column - Request Details */}
        <div className="space-y-6">
          {/* Request Headers */}
          {endpoint.requestHeaders && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Headers</h3>
              <div className="space-y-4">
                {Object.entries(endpoint.requestHeaders).map(([key, value]) => (
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
          {endpoint.requestBody && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Body</h3>
              <p className="text-sm text-gray-400 mb-4">This endpoint expects an object.</p>
              <div className="space-y-4">
                {Object.entries(endpoint.requestBody).map(([key, value]) => (
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
            code={endpoint.examples} 
            responseExample={endpoint.responseExample}
            endpointId={endpoint.id}
            method={endpoint.method}
            path={endpoint.path}
          />
        </div>
      </div>
    </div>
  );
}

