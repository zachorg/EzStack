"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface LoginContextType {
  isLoginDialogOpen: boolean;
  openLoginDialog: () => void;
  closeLoginDialog: () => void;
  redirect?: string;
  setRedirect: (redirect: string | undefined) => void;
}

const LoginContext = createContext<LoginContextType | undefined>(undefined);

export function LoginProvider({ children }: { children: ReactNode }) {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [redirect, setRedirect] = useState<string | undefined>(undefined);

  const openLoginDialog = () => setIsLoginDialogOpen(true);
  const closeLoginDialog = () => {
    setIsLoginDialogOpen(false);
    setRedirect(undefined); // Clear redirect when dialog closes
  };

  return (
    <LoginContext.Provider
      value={{
        isLoginDialogOpen,
        openLoginDialog,
        closeLoginDialog,
        redirect,
        setRedirect,
      }}
    >
      {children}
    </LoginContext.Provider>
  );
}

export function useLogin() {
  const context = useContext(LoginContext);
  if (context === undefined) {
    throw new Error("useLogin must be used within a LoginProvider");
  }
  return context;
}
