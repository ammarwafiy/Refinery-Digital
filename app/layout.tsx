import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Refinery Process Management System | Lam Soon Edible Oils",
  description: "Lam Soon Edible Oils Sdn. Bhd. — Nisshin Deodorizer Plant (RF-FR-004 Process Control & RF-FR-001 QC Lab)",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Refinery RMS",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#070b12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#070b12] text-slate-100 selection:bg-[#009fe3]/30 selection:text-[#22c3ff]">
        {children}
      </body>
    </html>
  );
}
