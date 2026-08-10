import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import localFont from "next/font/local";
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

// Montserrat — display headline (landing)
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
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
      className={`dark ${inter.variable} ${archia.variable} ${geistMono.variable} ${commitMono.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
        {children}
      </body>
    </html>
  );
}