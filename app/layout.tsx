import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { PageFade } from "@/components/page-fade";
import { GlobalTicker } from "@/components/global-ticker";

// Inter — UI sans (kept)
const inter = localFont({
  src: "../public/fonts/InterVariable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

// Archia (Bricolage Grotesque substitute) — display, single weight to reduce bundle
const archia = localFont({
  src: "../public/fonts/archia/Archia-Regular.woff2",
  variable: "--font-archia",
  display: "swap",
  weight: "400",
});

// Geist Mono — primary mono, single weight
const geistMono = localFont({
  src: "../public/fonts/geist-mono/GeistMono-Regular.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "400",
});

// Commit Mono — secondary mono, single weight
const commitMono = localFont({
  src: "../public/fonts/commit-mono/CommitMono-Regular.ttf",
  variable: "--font-commit-mono",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Screener",
  description: "Stock screener and portfolio analyzer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${archia.variable} ${geistMono.variable} ${commitMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
        <GlobalTicker />
        <TopNav />
        <main className="pt-24">
          <PageFade>{children}</PageFade>
        </main>
      </body>
    </html>
  );
}
