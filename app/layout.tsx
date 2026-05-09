import type { Metadata } from "next";
import "./globals.css";

// Static default metadata. When a recipient opens /?m=<encoded>, dynamic
// per-page OG metadata is produced by app/page.tsx via generateMetadata.
//
// metadataBase is used to absolutize relative OG image URLs. On Vercel,
// VERCEL_URL is auto-provided per-deployment; fall back to localhost for
// dev builds.
const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "The Definitive Decider",
  description:
    "Decide with weights, not vibes. A quick weighted-scoring tool for real decisions.",
  openGraph: {
    title: "The Definitive Decider",
    description: "Decide with weights, not vibes. Escape the Matrix.",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Definitive Decider",
    description: "Decide with weights, not vibes. Escape the Matrix.",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
