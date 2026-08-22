"use client";

import { AlertTriangle, X } from "lucide-react";

interface ExitConfirmationModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ExitConfirmationModal({
  onCancel,
  onConfirm,
}: ExitConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 animate-fade-in">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-5 mx-auto">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-foreground text-center mb-2">
          Exit Assessment?
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Your progress will be lost.
        </p>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-medium text-sm transition-colors"
          >
            Continue Test
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm shadow-lg shadow-red-500/25 transition-colors"
          >
            Exit Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
