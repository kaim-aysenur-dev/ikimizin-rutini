import type { Metadata, Viewport } from "next";
import { Pixelify_Sans } from "next/font/google";
import "./globals.css";

const pixel = Pixelify_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-pixel", display: "swap" });

export const metadata: Metadata = {
  title: "İkimizin Rutini",
  description: "Cengiz ve Ayşenur'un bakım, spor, beslenme ve ortak alışkanlık defteri.",
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/logo-icon.png", type: "image/png" }], apple: [{ url: "/logo-icon.png" }] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#141a33" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={pixel.variable}>
      <body>{children}</body>
    </html>
  );
}
