import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Kişisel site: arama motorlarında görünmesin
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // YDS Kampı İngilizce bölümüne taşındı (YDS kişiye göre bir mod)
  async redirects() {
    return [{ source: "/yds/:path*", destination: "/ingilizce/:path*", permanent: true }, { source: "/yds", destination: "/ingilizce", permanent: true }];
  },
};

export default nextConfig;

