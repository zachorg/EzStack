"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import LoginDialog from "./LoginDialog";

interface LoginDialogContextType {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

const LoginDialogContext = createContext<LoginDialogContextType | undefined>(undefined);

interface LoginDialogProviderProps {
  children: ReactNode;
}

export function LoginDialogProvider({ children }: LoginDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openDialog = () => setIsOpen(true);
  const closeDialog = () => setIsOpen(false);

  return (
    <LoginDialogContext.Provider value={{ isOpen, openDialog, closeDialog }}>
      {children}
      <LoginDialog isOpen={isOpen} onClose={closeDialog} />
    </LoginDialogContext.Provider>
  );
}

export function useLoginDialog() {
  const context = useContext(LoginDialogContext);
  if (context === undefined) {
    throw new Error("useLoginDialog must be used within a LoginDialogProvider");
  }
  return context;
}
