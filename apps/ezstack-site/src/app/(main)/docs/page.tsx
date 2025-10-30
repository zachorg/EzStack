"use client";

import { useState, useEffect } from "react";
import { useSidebar } from "../../components/SidebarProvider";
import { PRODUCTS } from "./data";
import { ProductSidebar } from "./components/ProductSidebar";
import { EndpointDetails } from "./components/EndpointDetails";
import { PAGE_SECTIONS } from "@/app/pageSections";

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
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).home,
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).docs,
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
