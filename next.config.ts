import type { NextConfig } from "next";

const localSupabaseConnectSources = (() => {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) return "";
  try {
    const url = new URL(configuredUrl);
    if (!(["localhost", "127.0.0.1"] as string[]).includes(url.hostname)) return "";
    const websocketOrigin = `${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}`;
    return ` ${url.origin} ${websocketOrigin}`;
  } catch {
    return "";
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${localSupabaseConnectSources}`,
  "manifest-src 'self'",
  ...(process.env.VERCEL === "1" ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
