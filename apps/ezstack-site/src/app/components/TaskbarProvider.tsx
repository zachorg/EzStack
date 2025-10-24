"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface TaskbarButton {
  id: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

interface TaskbarContextType {
  buttons: TaskbarButton[];
  addButton: (button: TaskbarButton) => void;
  removeButton: (id: string) => void;
  updateButton: (id: string, updates: Partial<TaskbarButton>) => void;
  clearButtons: () => void;
}

const TaskbarContext = createContext<TaskbarContextType | undefined>(undefined);

interface TaskbarProviderProps {
  children: ReactNode;
}

export function TaskbarProvider({ children }: TaskbarProviderProps) {
  const [buttons, setButtons] = useState<TaskbarButton[]>([]);

  const addButton = (button: TaskbarButton) => {
    setButtons(prev => [...prev.filter(b => b.id !== button.id), button]);
  };

  const removeButton = (id: string) => {
    setButtons(prev => prev.filter(b => b.id !== id));
  };

  const updateButton = (id: string, updates: Partial<TaskbarButton>) => {
    setButtons(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const clearButtons = () => {
    setButtons([]);
  };

  return (
    <TaskbarContext.Provider value={{
      buttons,
      addButton,
      removeButton,
      updateButton,
      clearButtons
    }}>
      {children}
    </TaskbarContext.Provider>
  );
}

export function useTaskbar() {
  const context = useContext(TaskbarContext);
  if (context === undefined) {
    throw new Error("useTaskbar must be used within a TaskbarProvider");
  }
  return context;
}
