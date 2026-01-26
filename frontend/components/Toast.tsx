"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = "info",
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: "bg-green-500/90 border-green-400",
    error: "bg-red-500/90 border-red-400",
    warning: "bg-yellow-500/90 border-yellow-400",
    info: "bg-blue-500/90 border-blue-400",
  };

  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <div
      className={`fixed top-20 right-4 z-[9999] ${styles[type]} text-white px-6 py-4 rounded-xl shadow-2xl border-2 animate-slideIn backdrop-blur-lg flex items-center gap-3 min-w-[300px]`}
    >
      <span className="text-2xl">{icons[type]}</span>
      <p className="flex-1 font-medium">{message}</p>
      <button
        onClick={onClose}
        className="text-white/80 hover:text-white text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
}
