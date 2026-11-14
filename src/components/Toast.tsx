"use client";

import React, { createContext, useContext, useCallback } from "react";
import hotToast, { Toaster as HotToaster } from "react-hot-toast";

export interface ToastContextType {
  toast: (message: string, type?: "success" | "error" | "info") => void;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    if (type === "success") {
      hotToast.success(message);
    } else if (type === "error") {
      hotToast.error(message);
    } else {
      hotToast(message);
    }
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    if (type === "success") {
      hotToast.success(message);
    } else if (type === "error") {
      hotToast.error(message);
    } else if (type === "warning") {
      hotToast(message, { icon: "⚠️" });
    } else {
      hotToast(message);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
      <HotToaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#090D16",
            color: "#F8FAFC",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            padding: "12px 16px",
            borderRadius: "14px",
            fontSize: "13px",
            fontWeight: "600",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
          },
          success: {
            iconTheme: {
              primary: "#10B981",
              secondary: "#FFFFFF",
            },
          },
          error: {
            iconTheme: {
              primary: "#EF4444",
              secondary: "#FFFFFF",
            },
            style: {
              border: "1px solid rgba(239, 68, 68, 0.4)",
            },
          },
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: (msg: string, type?: "success" | "error" | "info") => {
        if (type === "success") hotToast.success(msg);
        else if (type === "error") hotToast.error(msg);
        else hotToast(msg);
      },
      showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => {
        if (type === "success") hotToast.success(msg);
        else if (type === "error") hotToast.error(msg);
        else if (type === "warning") hotToast(msg, { icon: "⚠️" });
        else hotToast(msg);
      },
    };
  }
  return context;
}

export { hotToast as toast };
