"use client";

import { useEffect, useState } from "react";
import { QrCode, Camera, Check } from "lucide-react";

const STEPS = ["qr", "name", "upload", "gallery", "chat"] as const;
type Step = (typeof STEPS)[number];

const STEP_DURATION = 3200;

const AVATARS = ["😎", "🎉", "👻", "🦊", "🎸", "🌺", "🔥", "💫"];
const COLORS = [
  "linear-gradient(135deg,#667eea,#764ba2)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#43e97b,#38f9d7)",
  "linear-gradient(135deg,#fa709a,#fee140)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
];

const NOTIFICATIONS = [
  "תמר העלתה תמונה מהחופה 📸",
  "עמית הצטרף לClink 🥂",
  "ליאת העלתה סרטון 🎬",
  "יובל לייק לתמונה שלך ❤️",
];

export default function AppDemo() {
  const [step, setStep] = useState<Step>("qr");
  const [galleryItems, setGalleryItems] = useState<number[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notifIndex, setNotifIndex] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(1);

  // Cycle steps
  useEffect(() => {
    const idx = STEPS.indexOf(step);
    const timer = setTimeout(() => {
      const next = STEPS[(idx + 1) % STEPS.length];
      if (next === "qr") setGalleryItems([]);
      setStep(next);
    }, STEP_DURATION);
    return () => clearTimeout(timer);
  }, [step]);

  // Gallery: add photos progressively
  useEffect(() => {
    if (step !== "gallery") return;
    let count = 0;
    const interval = setInterval(() => {
      if (count >= 6) { clearInterval(interval); return; }
      setGalleryItems(prev => [...prev, count]);
      count++;
    }, 380);
    return () => clearInterval(interval);
  }, [step]);

  // Upload progress animation
  useEffect(() => {
    if (step !== "upload") { setUploadProgress(0); return; }
    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(p + 8, 100);
      setUploadProgress(p);
      if (p >= 100) clearInterval(interval);
    }, 160);
    return () => clearInterval(interval);
  }, [step]);

  // Floating notifications on gallery step
  useEffect(() => {
    if (step !== "gallery") { setShowNotif(false); return; }
    const timer = setTimeout(() => {
      setShowNotif(true);
      setNotifIndex(n => (n + 1) % NOTIFICATIONS.length);
      const hide = setTimeout(() => setShowNotif(false), 2000);
      return () => clearTimeout(hide);
    }, 800);
    return () => clearTimeout(timer);
  }, [step, galleryItems.length]);

  return (
    <div className="relative flex items-center justify-center select-none">
      {/* Glow behind phone */}
      <div className="absolute inset-0 bg-wedding-accent/20 rounded-full blur-3xl scale-75 pointer-events-none" />

      {/* Phone frame */}
      <div className="relative w-56 h-[460px] bg-[#0a0a18] rounded-[3rem] border-[3px] border-white/10 shadow-2xl overflow-hidden z-10">
        {/* Dynamic island */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-20 flex items-center justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-800 border border-gray-700" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-800 border border-gray-700 opacity-70" />
        </div>

        {/* Screen */}
        <div className="w-full h-full bg-party-bg flex flex-col">

          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-8 pb-1 flex-shrink-0">
            <span className="text-[10px] text-white font-bold tracking-wide">Clink</span>
            <div className="flex items-center gap-1">
              {[3, 2, 1].map(h => (
                <div key={h} className="w-[3px] rounded-sm bg-party-gold" style={{ height: h * 4 }} />
              ))}
              <div className="w-4 h-2.5 border border-white/30 rounded-sm ml-1 flex items-center px-[1px]">
                <div className="w-2/3 h-full bg-party-gold rounded-sm" />
              </div>
            </div>
          </div>

          {/* Step content */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 overflow-hidden">

            {/* ── QR step ── */}
            {step === "qr" && (
              <div className="text-center animate-fade-in w-full">
                <p className="text-gray-400 text-[11px] mb-3">סרקו את ה-QR כדי להצטרף לClink</p>
                <div className="w-28 h-28 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-party-gold/20 mb-3">
                  <QrCode className="w-20 h-20 text-gray-900" strokeWidth={1.5} />
                </div>
                <div className="bg-party-surface border border-party-border rounded-xl px-3 py-2 mx-auto inline-block">
                  <p className="text-yellow-300 text-[11px] font-semibold">💍 חתונה יובל ועמית</p>
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-gray-500 text-[10px]">23 אורחים כרגע</p>
                </div>
              </div>
            )}

            {/* ── Name step ── */}
            {step === "name" && (
              <div className="w-full animate-fade-in">
                <p className="text-white font-bold text-center text-sm mb-4">בחר/י אווטאר ושם</p>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {AVATARS.map((emoji, i) => (
                    <button
                      key={emoji}
                      onClick={() => setSelectedAvatar(i)}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all ${
                        selectedAvatar === i
                          ? "bg-party-gold/20 border border-party-gold/60 scale-110"
                          : "bg-party-surface border border-party-border"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="bg-party-surface border border-party-gold/40 rounded-xl px-3 py-2 text-white text-sm mb-3 flex items-center gap-2">
                  <span>{AVATARS[selectedAvatar]}</span>
                  <span>נועם</span>
                  <span className="w-0.5 h-4 bg-party-gold animate-pulse ml-auto" />
                </div>
                <div className="w-full btn-gold rounded-xl py-2.5 text-white text-sm font-bold text-center">
                  כניסה לClink ✨
                </div>
              </div>
            )}

            {/* ── Upload step ── */}
            {step === "upload" && (
              <div className="w-full animate-fade-in">
                <p className="text-white font-bold text-center text-sm mb-3">העלאת תמונה</p>
                <div className="w-full h-36 bg-party-surface rounded-2xl overflow-hidden relative mb-3 border border-party-border">
                  <div className="w-full h-full bg-gradient-to-br from-party-gold/20 to-amber-900/20 flex items-center justify-center">
                    <Camera className="w-10 h-10 text-white/20" />
                  </div>
                  {/* Corner guides */}
                  {[["top-2 left-2","border-t border-l"], ["top-2 right-2","border-t border-r"],
                    ["bottom-2 left-2","border-b border-l"], ["bottom-2 right-2","border-b border-r"]].map(([pos, border]) => (
                    <div key={pos} className={`absolute ${pos} w-4 h-4 ${border} border-white/40`} />
                  ))}
                  {/* Upload progress overlay */}
                  {uploadProgress > 0 && (
                    <>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                        <div
                          className="h-full bg-gradient-to-r from-party-gold-light to-amber-400 transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      {uploadProgress === 100 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center animate-fade-in">
                          <div className="bg-emerald-500 rounded-full p-2 shadow-lg">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <p className="text-center text-[11px] text-gray-400">
                  {uploadProgress < 100 ? `מעלה... ${uploadProgress}%` : "הועלה בהצלחה! 🎉"}
                </p>
              </div>
            )}

            {/* ── Chat step ── */}
            {step === "chat" && (
              <div className="w-full animate-fade-in flex flex-col h-full">
                <p className="text-white text-xs font-bold mb-2 text-center">צ׳אט קבוצתי 💬</p>
                <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                  {/* Message from other */}
                  <div className="flex items-end gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-party-surface border border-party-border flex items-center justify-center text-xs flex-shrink-0">🎉</div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-gray-500 mr-1">תמר</span>
                      <div className="bg-party-surface border border-party-border rounded-2xl rounded-bl-sm px-2.5 py-1.5 text-[11px] text-white max-w-[140px]">
                        איזה אירוע מדהים! 🥂
                      </div>
                    </div>
                  </div>
                  {/* Message from me */}
                  <div className="flex items-end gap-1.5 flex-row-reverse">
                    <div className="w-6 h-6 rounded-full bg-party-gold/20 border border-party-gold/40 flex items-center justify-center text-xs flex-shrink-0">😎</div>
                    <div className="flex flex-col gap-0.5 items-end">
                      <span className="text-[9px] text-gray-500 ml-1">נועם</span>
                      <div className="bg-party-gold/80 rounded-2xl rounded-br-sm px-2.5 py-1.5 text-[11px] text-white max-w-[140px]">
                        תעלו תמונות! 📸
                      </div>
                    </div>
                  </div>
                  {/* Message from other */}
                  <div className="flex items-end gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-party-surface border border-party-border flex items-center justify-center text-xs flex-shrink-0">🌺</div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-gray-500 mr-1">ליאת</span>
                      <div className="bg-party-surface border border-party-border rounded-2xl rounded-bl-sm px-2.5 py-1.5 text-[11px] text-white max-w-[140px]">
                        העליתי סרטון מהחופה 🎬
                      </div>
                    </div>
                  </div>
                  {/* Message from other */}
                  <div className="flex items-end gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-party-surface border border-party-border flex items-center justify-center text-xs flex-shrink-0">🦊</div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-gray-500 mr-1">עמית</span>
                      <div className="bg-party-surface border border-party-border rounded-2xl rounded-bl-sm px-2.5 py-1.5 text-[11px] text-white max-w-[140px]">
                        ראיתם את הריקוד? ❤️
                      </div>
                    </div>
                  </div>
                </div>
                {/* Input bar */}
                <div className="flex items-center gap-1.5 mt-2 bg-party-surface border border-party-border rounded-xl px-2.5 py-1.5">
                  <span className="text-gray-500 text-[10px] flex-1">הודעה לכולם...</span>
                  <div className="w-5 h-5 btn-gold rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M9 5H1M5 1L1 5L5 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* ── Gallery step ── */}
            {step === "gallery" && (
              <div className="w-full animate-fade-in">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-white text-xs font-bold">גלריה חיה</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] text-red-400">LIVE</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-xl overflow-hidden transition-all duration-300"
                      style={{
                        background: COLORS[i],
                        opacity: galleryItems.includes(i) ? 1 : 0,
                        transform: galleryItems.includes(i) ? "scale(1)" : "scale(0.8)",
                      }}
                    />
                  ))}
                </div>
                <p className="text-gray-500 text-[10px] mt-2 text-center">
                  {galleryItems.length} תמונות · {Math.max(0, 6 - galleryItems.length) > 0 ? "עוד מגיעות..." : "הגלריה עודכנה ✓"}
                </p>
              </div>
            )}
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 pb-4 flex-shrink-0">
            {STEPS.map(s => (
              <div
                key={s}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: s === step ? 20 : 6,
                  background: s === step ? "#d9a98e" : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating notification */}
      <div
        className={`absolute -right-2 top-16 transition-all duration-500 z-20 ${
          showNotif ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="wedding-card rounded-2xl px-3 py-2 text-xs text-wedding-ink flex items-center gap-2 shadow-2xl whitespace-nowrap">
          {NOTIFICATIONS[notifIndex]}
        </div>
      </div>

      {/* Step label */}
      <div className="absolute -bottom-8 left-0 right-0 flex justify-center">
        <span className="text-xs text-wedding-muted">
          {{
            qr: "סריקת QR",
            name: "בחירת שם",
            upload: "העלאת תמונה",
            gallery: "גלריה חיה",
            chat: "צ׳אט קבוצתי",
          }[step]}
        </span>
      </div>
    </div>
  );
}
