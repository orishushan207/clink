"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

interface CopyLinkButtonProps {
  url: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
}

export default function CopyLinkButton({
  url,
  label = "העתק קישור",
  variant = "secondary",
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Button variant={variant} size="md" onClick={handleCopy} className="gap-2">
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-400" />
          <span className="text-emerald-400">הועתק!</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}
