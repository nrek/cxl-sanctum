"use client";

import { useState } from "react";
import Tooltip from "./Tooltip";

interface CopyButtonProps {
  text: string;
  /** Icon-only (with tooltip) vs label text */
  variant?: "icon" | "text";
  label?: string;
  className?: string;
}

export default function CopyButton({
  text,
  variant = "icon",
  label = "Copy",
  className = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          copied
            ? "bg-success/25 text-success"
            : "bg-sanctum-accent/20 text-sanctum-accent hover:bg-sanctum-accent/30"
        } ${className}`}
      >
        <i className="fa-regular fa-copy" aria-hidden />
        {copied ? "Copied!" : label}
      </button>
    );
  }

  return (
    <Tooltip label={copied ? "Copied" : "Copy to clipboard"}>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy to clipboard"}
        className={`icon-btn text-sanctum-accent hover:text-sanctum-mist ${
          copied ? "!text-success" : ""
        } ${className}`}
      >
        <i
          className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"}
          aria-hidden
        />
      </button>
    </Tooltip>
  );
}
