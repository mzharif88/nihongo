import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { ROLE_SCRIPT } from "@/lib/role-colours";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NihonGo! JLPT",
  description: "Personal Japanese study: SRS, lessons, sentence builder and JLPT mocks.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The script may add .roles-off before hydration, hence suppressHydrationWarning.
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ROLE_SCRIPT }} />
      </head>
      <body className={`${notoSansJp.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
