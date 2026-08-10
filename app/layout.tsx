import type { Metadata } from "next";

import localFont from "next/font/local";
import { Manrope } from "next/font/google";
import "./globals.css";

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

// Manrope — display + UI typography (Fey UI Kit)
// Calibre (Fey display font) is not on Google Fonts; Manrope is the
// closest visual match per the Figma file's metadata.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
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
      className={`dark ${inter.variable} ${archia.variable} ${geistMono.variable} ${commitMono.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
        {children}
      </body>
    </html>
  );
}