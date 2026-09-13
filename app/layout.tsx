import type { Metadata } from "next";

import localFont from "next/font/local";
import { Manrope, Archivo_Black, Roboto_Slab } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/foundation/theme-provider";

const inter = localFont({
  src: "../public/fonts/InterVariable.woff2",
  variable: "--font-inter",
  display: "swap",
  preload: false,
  weight: "100 900",
});

const archia = localFont({
  src: "../public/fonts/archia/Archia-Regular.woff2",
  variable: "--font-archia",
  display: "swap",
  preload: false,
  weight: "400",
});

const geistMono = localFont({
  src: "../public/fonts/geist-mono/GeistMono-Regular.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
  weight: "400",
});

const commitMono = localFont({
  src: "../public/fonts/commit-mono/CommitMono-Regular.ttf",
  variable: "--font-commit-mono",
  display: "swap",
  preload: false,
  weight: "400",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  preload: false,
  weight: ["300", "400", "500", "600", "700", "800"],
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  variable: "--font-archivo-black",
  display: "swap",
  preload: false,
  weight: ["400"],
});

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-roboto-slab",
  display: "swap",
  preload: false,
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Sulfur.io",
  description:
    "Plataforma de análise de mercados financeiros — stocks, crypto, ETFs, portfolios e índices",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${archia.variable} ${geistMono.variable} ${commitMono.variable} ${manrope.variable} ${archivoBlack.variable} ${robotoSlab.variable} h-full antialiased`}
    >
      <body className="min-h-full text-ink">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}