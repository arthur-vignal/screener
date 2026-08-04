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

// Archia — display
const archia = localFont({
  src: [
    { path: "../public/fonts/archia/Archia-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/archia/Archia-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/archia/Archia-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-archia",
  display: "swap",
});

// Geist Mono — primary mono
const geistMono = localFont({
  src: [
    { path: "../public/fonts/geist-mono/GeistMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/geist-mono/GeistMono-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/geist-mono/GeistMono-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});

// Commit Mono — secondary mono
const commitMono = localFont({
  src: [
    { path: "../public/fonts/commit-mono/CommitMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/commit-mono/CommitMono-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-commit-mono",
  display: "swap",
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
