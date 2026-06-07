"use client";

import Image from "next/image";

interface CheerZLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string; // kept for API compatibility
}

const GOLD = "#c9a227";
const WHITE = "white";

/** Camera-only icon — used when showText={false} */
function CameraIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="9" width="36" height="24" rx="5.5" stroke={WHITE} strokeWidth="3" fill="none" />
      <path d="M12,9 L12,5 Q12,3 14,3 L21,3 Q23,3 23,5 L23,9" stroke={WHITE} strokeWidth="3" fill="none" strokeLinejoin="round" />
      <circle cx="20" cy="21" r="7" fill={GOLD} />
      <circle cx="20" cy="21" r="3.5" fill="rgba(255,255,255,0.2)" />
      <circle cx="31" cy="13" r="2.2" fill={WHITE} />
    </svg>
  );
}

// Transparent PNG — 1037×366 (ratio ≈ 2.83 : 1)
const LOGO_RATIO = 1037 / 366;

export default function PicMeLogo({ size = 40, showText = true }: CheerZLogoProps) {
  if (!showText) return <CameraIcon size={size} />;

  const h = size;
  const w = Math.round(size * LOGO_RATIO);

  return (
    <Image
      src="/clink-logo-transparent.png"
      alt="Clink"
      width={w}
      height={h}
      style={{ objectFit: "contain" }}
      priority
    />
  );
}
