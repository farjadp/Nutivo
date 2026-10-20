import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

/**
 * IRANYekanX (Fontiran, proprietary). Variable weight, Persian digits built in (FaNum).
 * License: app/fonts/FontLicense.txt must carry the 6-digit license code before launch.
 */
const yekan = localFont({
  src: "./fonts/IRANYekanXVFaNum.woff2",
  variable: "--font-fa",
  weight: "100 1000",
  display: "swap",
  fallback: ["Tahoma", "system-ui", "sans-serif"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-en",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nutivo",
  description: "دستیار تغذیه‌ای که می‌داند چه خورده‌ای و کمک می‌کند انتخاب بعدی بهتری داشته باشی.",
  applicationName: "Nutivo",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#101315" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={`${yekan.variable} ${jakarta.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
