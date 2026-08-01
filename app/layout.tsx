import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

// Geist loaded locally to suppress Turbopack's automatic Geist fetch
// (Next 16 bug). The class is added but we use Inter as the primary font.
const geist = localFont({
  src: "../public/fonts/InterVariable.woff2",
  variable: "--font-geist",
  display: "swap",
  weight: "100 900",
});

const inter = localFont({
  src: "../public/fonts/InterVariable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
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
      className={`${geist.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
