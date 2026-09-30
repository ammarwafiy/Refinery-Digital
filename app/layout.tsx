import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  themeColor: "#070B12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`dark ${inter.variable} h-full`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('refinery_system_settings');
                  var theme = 'dark';
                  if (stored) {
                    try { theme = JSON.parse(stored).theme || 'dark'; } catch(e) {}
                  } else {
                    var direct = localStorage.getItem('refinery_theme');
                    if (direct) theme = direct;
                  }
                  var resolved = theme === 'light' ? 'light' : (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                  if (resolved === 'light') {
                    document.documentElement.classList.add('light-theme');
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.documentElement.style.colorScheme = 'light';
                  } else {
                    document.documentElement.classList.remove('light-theme');
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.documentElement.style.colorScheme = 'dark';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0a0e18] text-[#f3f5f9] selection:bg-[#d81f2c]/25 selection:text-[#f47b83] antialiased">
        <div className="bgfx" aria-hidden="true">
          <svg viewBox="0 0 520 700" preserveAspectRatio="xMaxYMax meet">
            <rect x="300" y="120" width="80" height="560" rx="40" />
            <path d="M300 200h80M300 260h80M300 320h80M300 380h80M300 440h80M300 500h80M300 560h80" />
            <rect x="420" y="380" width="70" height="300" rx="10" />
            <path d="M420 450h70M420 520h70" />
            <rect x="180" y="460" width="90" height="220" rx="45" />
            <path d="M340 120V70h70v40M410 70V40M380 320h40v60M270 560h30M340 680V640H110V560h70M60 680h440" />
            <circle cx="130" cy="600" r="20" />
          </svg>
        </div>
        {children}
      </body>
    </html>
  );
}
