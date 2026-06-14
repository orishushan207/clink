"use client";

import Image from "next/image";

interface CheerZLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string; // kept for API compatibility
  /** Use the dark variant for light/cream backgrounds */
  dark?: boolean;
}

const GOLD = "#d9a98e";
const WHITE = "white";
const INK = "#3a2a22";

/** Camera-only icon — used when showText={false} */
function CameraIcon({ size, dark = false }: { size: number; dark?: boolean }) {
  const stroke = dark ? INK : WHITE;
  const accent = dark ? "#c9836a" : GOLD;
  const dot = dark ? "rgba(58,42,34,0.15)" : "rgba(255,255,255,0.2)";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="9" width="36" height="24" rx="5.5" stroke={stroke} strokeWidth="3" fill="none" />
      <path d="M12,9 L12,5 Q12,3 14,3 L21,3 Q23,3 23,5 L23,9" stroke={stroke} strokeWidth="3" fill="none" strokeLinejoin="round" />
      <circle cx="20" cy="21" r="7" fill={accent} />
      <circle cx="20" cy="21" r="3.5" fill={dot} />
      <circle cx="31" cy="13" r="2.2" fill={stroke} />
    </svg>
  );
}

// Transparent PNG — 1037×366 (ratio ≈ 2.83 : 1)
const LOGO_RATIO = 1037 / 366;

export default function PicMeLogo({ size = 40, showText = true, dark = false }: CheerZLogoProps) {
  if (!showText) return <CameraIcon size={size} dark={dark} />;

  const h = size;
  const w = Math.round(size * LOGO_RATIO);

  return (
    <Image
      src={dark ? "/clink-logo-dark.png" : "/clink-logo-transparent.png"}
      alt="Clink"
      width={w}
      height={h}
      style={{ objectFit: "contain" }}
      priority
    />
  );
}
