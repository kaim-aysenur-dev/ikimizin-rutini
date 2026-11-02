import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, Pixelify_Sans } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import "./globals.css";
import "./sections.css";
import "./sections-2.css";
import "./sections-3.css";
import "./sections-4.css";
import "./pixel-theme.css";

// Başlıklar: yumuşak serif (SOFT ekseni açık). Metin ve sayılar: DM Sans (tabular rakamlar CSS'te).
const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
  axes: ["SOFT", "opsz"],
});
const body = DM_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });
// Macera Günlüğü kaplaması (pixel-theme.css) başlık ve metinde bunu kullanır
const pixel = Pixelify_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-pixel", display: "swap" });

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/logo-icon.png", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Klavye açılınca düzen küçülsün, giriş butonu görünür kalsın
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2b2833" },
    { media: "(prefers-color-scheme: dark)", color: "#2b2833" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      // tema seçimi yok: piksel kaplama tek palet, koyu mod kuralları devreye girmesin
      data-theme="light"
      className={`${display.variable} ${body.variable} ${pixel.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

