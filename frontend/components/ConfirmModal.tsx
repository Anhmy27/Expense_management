"use client";

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export default function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  type = "warning",
}: ConfirmModalProps) {
  const buttonStyles = {
    danger: "gradient-danger",
    warning: "bg-yellow-500 hover:bg-yellow-600",
    info: "gradient-primary",
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="glass max-w-md w-full rounded-2xl p-6 animate-scaleIn shadow-2xl border border-white/10">
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-200 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className={`flex-1 ${buttonStyles[type]} text-white py-3 px-4 rounded-xl font-semibold hover-lift transition-all`}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-slate-500 transition-all"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
