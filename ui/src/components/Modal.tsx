"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="sanctum-card w-full max-w-lg border-sanctum-line/25 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b border-sanctum-line/20 px-6 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-sanctum-mist">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn rounded-md text-sanctum-muted hover:text-sanctum-mist"
            aria-label="Close dialog"
          >
            <i className="fa-solid fa-xmark text-lg" aria-hidden />
          </button>
        </div>
        <div className="px-6 py-4 text-sanctum-mist">{children}</div>
      </div>
    </div>
  );
}
