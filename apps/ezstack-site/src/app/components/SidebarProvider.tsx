"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface SidebarButton {
  id: string;
  name: string;
  href: string;
  icon: ReactNode;
  current?: boolean;
  badge?: string;
}

export interface SidebarSection {
  title: string;
  items: SidebarButton[];
}

interface SidebarContextType {
  sections: SidebarSection[];
  setSections: (sections: SidebarSection[]) => void;
  updateSection: (title: string, items: SidebarButton[]) => void;
  clearSections: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [sections, setSections] = useState<SidebarSection[]>([]);

  const updateSection = (title: string, items: SidebarButton[]) => {
    setSections(prev => {
      const existing = prev.find(section => section.title === title);
      if (existing) {
        return prev.map(section => 
          section.title === title ? { ...section, items } : section
        );
      } else {
        return [...prev, { title, items }];
      }
    });
  };

  const clearSections = () => {
    setSections([]);
  };

  return (
    <SidebarContext.Provider value={{
      sections,
      setSections,
      updateSection,
      clearSections
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
