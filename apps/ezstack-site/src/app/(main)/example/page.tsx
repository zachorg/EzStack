"use client";

import { useEffect } from "react";
import { useTaskbar } from "@/app/components/TaskbarProvider";

export default function ExamplePage() {
  const { addButton, removeButton } = useTaskbar();

  useEffect(() => {
    // Add taskbar buttons for this page
    const buttons = [
      {
        id: "example-button-1",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        ),
        label: "Add Item",
        onClick: () => console.log("Add item clicked"),
        isActive: false
      },
      {
        id: "example-button-2",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ),
        label: "View Details",
        onClick: () => console.log("View details clicked"),
        isActive: false
      }
    ];

    // Add buttons when component mounts
    buttons.forEach(button => addButton(button));

    // Cleanup on unmount
    return () => {
      buttons.forEach(button => removeButton(button.id));
    };
  }, [addButton, removeButton]);

  return (
    <div className="min-h-full p-6">
      <h1 className="text-2xl font-bold text-gray-200 mb-4">Example Page</h1>
      <p className="text-gray-400">
        This page demonstrates how to use the modular taskbar system. 
        Check the left sidebar for the buttons this page added!
      </p>
    </div>
  );
}
