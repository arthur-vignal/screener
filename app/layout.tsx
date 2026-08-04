import type { Metadata } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { PageFade } from "@/components/page-fade";

const inter = localFont({
  src: "../public/fonts/InterVariable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-font",
  display: "swap",
  weight: ["400", "500", "600"],
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
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
        <TopNav />
        <main className="pt-16">
          <PageFade>{children}</PageFade>
        </main>
      </body>
    </html>
  );
}
