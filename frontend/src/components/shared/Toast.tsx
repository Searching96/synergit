import { useEffect, useState } from "react";
import { StopIcon, CheckCircleIcon, InfoIcon } from "@primer/octicons-react";

interface ToastProps {
  message: string;
  type?: "error" | "success" | "info";
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = "error", duration = 5000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay to allow the DOM to render before triggering the slide-up transition
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for slide-down animation
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onClose]);

  const config = {
    error: {
      bg: "bg-[#cf222e]",
      icon: <StopIcon size={16} />
    },
    success: {
      bg: "bg-[#1a7f37]",
      icon: <CheckCircleIcon size={16} />
    },
    info: {
      bg: "bg-[#0969da]",
      icon: <InfoIcon size={16} />
    }
  };

  const { bg, icon } = config[type] || config.error;

  return (
    <div
      className={`fixed bottom-6 left-6 z-[100] rounded-md shadow-lg flex overflow-hidden border border-[var(--border-default)] transition-all duration-300 transform ${
        visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
    >
      <div className={`flex items-center justify-center px-4 py-3 text-white ${bg}`}>
        {icon}
      </div>
      <div className="flex items-center px-4 py-3 bg-[var(--surface-canvas)]">
        <span className="text-sm text-[var(--text-primary)]">{message}</span>
      </div>
    </div>
  );
}
