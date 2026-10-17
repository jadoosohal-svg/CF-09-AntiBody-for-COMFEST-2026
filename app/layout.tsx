import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Antibody — see the scam built for you",
  description:
    "Antibody builds the exact scam a criminal would craft from your public footprint, runs it on you in a safe simulation, and shows you how to fix it.",
};

export const viewport: Viewport = { themeColor: "#07080a" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="dot-grid" aria-hidden />
        <div className="noise" aria-hidden />
        <div className="relative z-10 min-h-full">{children}</div>
        <Toaster theme="dark" position="bottom-center" toastOptions={{ className: "font-sans" }} />
      </body>
    </html>
  );
}
