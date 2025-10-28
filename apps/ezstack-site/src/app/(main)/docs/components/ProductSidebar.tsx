"use client";

import { Product } from "../types";

interface ProductSidebarProps {
  products: Product[];
  selectedEndpoint: string;
  expandedProducts: Set<string>;
  onSelectEndpoint: (endpointId: string) => void;
  onToggleProduct: (productId: string) => void;
}

export function ProductSidebar({
  products,
  selectedEndpoint,
  expandedProducts,
  onSelectEndpoint,
  onToggleProduct
}: ProductSidebarProps) {
  return (
    <div className="w-64 border-r p-4 overflow-y-auto fixed left-12 top-[47px] bottom-0" style={{ borderColor: '#1F1F1F', background: '#0F0F0F' }}>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">API Documentation</h2>
      
      <div className="space-y-1">
        {/* Products - Top Level */}
        {products.map((product) => (
          <div key={product.id}>
            {/* Product Name */}
            <button
              onClick={() => !product.comingSoon && onToggleProduct(product.id)}
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
                    onClick={() => onSelectEndpoint(endpoint.id)}
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
  );
}

