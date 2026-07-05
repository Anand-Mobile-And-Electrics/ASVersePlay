import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "ASVerse Play | Open OTT Streaming Platform",
    template: "%s | ASVerse Play",
  },
  description:
    "ASVerse Play is a scalable open-source OTT platform for movies, series, anime, live events, IPTV, and more with secure RBAC and modern streaming architecture.",
  openGraph: {
    title: "ASVerse Play",
    description: "Modular enterprise OTT streaming platform.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ASVerse Play",
    description: "Open OTT streaming platform with full admin control.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6997490039969865"
          crossOrigin="anonymous"
        ></script>
      </head>

      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
            <a
              href="/"
              className="text-xl font-bold tracking-tight text-white"
            >
              ASVerse <span className="text-indigo-400">Play</span>
            </a>

            <div className="flex items-center gap-4 text-sm text-slate-300">
              <a href="/" className="hover:text-white">
                Website
              </a>

              <a href="/live" className="hover:text-white">
                Live Sports
              </a>

              <a href="/admin" className="hover:text-white">
                Admin Dashboard
              </a>

              <a href="/auth" className="hover:text-white">
                Admin Login
              </a>
            </div>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}
