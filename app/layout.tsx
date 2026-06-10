import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clink — גלריה חיה לאירועים",
  description:
    "האורחים סורקים QR, מעלים תמונות וסרטונים, וכולם צופים בגלריה אחת בזמן אמת",
  keywords: ["אירוע", "גלריה", "QR", "תמונות", "מסיבה", "חתונה", "יום הולדת"],
  authors: [{ name: "Clink" }],
  openGraph: {
    title: "Clink — גלריה חיה לאירועים",
    description: "שתף תמונות מהאירוע שלך בזמן אמת",
    type: "website",
  },
  // PWA meta tags for mobile
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clink",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1f1219",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#37212c",
              color: "#fff",
              border: "1px solid rgba(224, 184, 168, 0.3)",
              fontFamily: "Heebo, sans-serif",
              direction: "rtl",
              borderRadius: "16px",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#d9a98e", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#fff" },
            },
          }}
        />
      </body>
    </html>
  );
}
