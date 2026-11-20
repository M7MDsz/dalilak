import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

// IBM Plex Sans Arabic, self-hosted (the demo must work with no internet). Mohammed's choice, 18 Nov 2026.
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
// The «لعبة» design (Lawha) uses its own pair, self-hosted too: Readex Pro for text, Alexandria for headings, numbers and
// buttons. Their @font-face rules carry unicode ranges and only download when the Lawha design is on.
import "@fontsource/readex-pro/400.css";
import "@fontsource/readex-pro/500.css";
import "@fontsource/readex-pro/600.css";
import "@fontsource/alexandria/700.css";
import "@fontsource/alexandria/800.css";

import { Providers } from "@/components/providers";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-boot";

import "./globals.css";

// Browser tab: «دليلك · {page}» (TEAM-BRIEF 0). A page sets `export const metadata = { title: "الوظائف" }`.
export const metadata: Metadata = {
  title: { default: "دليلك", template: "دليلك · %s" },
  description: "دليلك من مهاراتك إلى وظيفتك",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light" };

// Providers: direction, motion (reduced motion, ?still=1), tooltips and the one toast viewport (src/components/providers.tsx).
// The <head> script sets the user's design (data-theme) before the first paint, so it never flashes (src/lib/theme.ts);
// <html> therefore differs from the server's markup by that one attribute, hence suppressHydrationWarning.
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html dir="rtl" lang="ar" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
