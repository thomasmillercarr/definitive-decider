import type { NextConfig } from "next";

// Security headers applied to every route. This app serves no third-party
// scripts, makes no runtime external calls, and has no auth/cookies.
//
// 'unsafe-inline' is present on script-src and style-src because Next.js App
// Router emits inline bootstrap/hydration <script> and <style> tags; the strict
// alternative (per-request nonces) requires middleware and forces every route
// to render dynamically, which isn't worth it here. The XSS risk 'unsafe-inline'
// normally reintroduces is not exploitable in this app: there are no HTML-
// injection sinks (no dangerouslySetInnerHTML), all user text is escaped by
// React or rendered into an image, and no user input is ever placed in a
// <script>. frame-ancestors/object-src/base-uri stay locked down regardless.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
