import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { PageFade } from "@/components/page-fade";
import { GlobalTicker } from "@/components/global-ticker";
import { SelectionProvider } from "@/components/ui/selection-context";
import { MultiSelectToolbar } from "@/components/ui/multi-select-toolbar";

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
  title: "Sulfur.io",
  description: "Plataforma de análise de mercados financeiros — stocks, crypto, ETFs, portfolios e índices",
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
        <SelectionProvider>
          <GlobalTicker />
          <TopNav />
          <main className="pt-24">
            <PageFade>{children}</PageFade>
          </main>
          <MultiSelectToolbar />
        </SelectionProvider>
      </body>
    </html>
  );
}
