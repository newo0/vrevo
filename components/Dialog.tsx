"use client";
import { useEffect, useRef } from "react";
export default function Dialog({
  children,
  title,
  onClose,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <button
        className="dialog-close"
        aria-label="Закрыть окно"
        onClick={onClose}
      >
        ×
      </button>
      {children}
    </dialog>
  );
}
