"use client";

import { useState, useEffect } from "react";
import { useSidebar } from "../../components/SidebarProvider";
import { PRODUCTS } from "./data";
import { ProductSidebar } from "./components/ProductSidebar";
import { EndpointDetails } from "./components/EndpointDetails";

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
      <ProductSidebar
        products={PRODUCTS}
        selectedEndpoint={selectedEndpoint}
        expandedProducts={expandedProducts}
        onSelectEndpoint={setSelectedEndpoint}
        onToggleProduct={toggleProduct}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto ml-64 min-h-screen" style={{ background: '#0D0D0D' }}>
        <div className="max-w-[1400px] mx-auto px-12 py-6">
          {currentEndpoint && currentProduct ? (
            <EndpointDetails 
              endpoint={currentEndpoint}
              product={currentProduct}
            />
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
