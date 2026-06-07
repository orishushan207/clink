"use client";

import { useRef } from "react";
import QRCode from "react-qr-code";
import Button from "@/components/ui/Button";
import { Download, QrCode } from "lucide-react";

interface QRCodeDisplayProps {
  url: string;
  eventName?: string;
  size?: number;
}

export default function QRCodeDisplay({
  url,
  eventName,
  size = 200,
}: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    // Convert SVG to PNG via canvas
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const padding = 40;
    canvas.width = size + padding * 2;
    canvas.height = size + padding * 2;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url_obj = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, padding, padding, size, size);
      URL.revokeObjectURL(url_obj);

      const link = document.createElement("a");
      link.download = `partydrop-qr-${eventName || "event"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = url_obj;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-yellow-400">
        <QrCode className="h-5 w-5" />
        <span className="text-sm font-medium">QR Code לאירוע</span>
      </div>

      {/* QR Code */}
      <div
        ref={qrRef}
        className="bg-white p-4 rounded-2xl shadow-lg shadow-party-gold/20"
      >
        <QRCode
          value={url}
          size={size}
          style={{ display: "block" }}
          viewBox={`0 0 256 256`}
          level="M"
        />
      </div>

      <p className="text-xs text-gray-500 text-center max-w-[200px] leading-relaxed">
        אורחים סורקים את ה-QR code כדי להצטרף לClink
      </p>

      <Button
        variant="outline"
        size="sm"
        onClick={downloadQR}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        הורד QR
      </Button>
    </div>
  );
}
