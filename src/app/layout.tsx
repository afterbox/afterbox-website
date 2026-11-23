import type { Metadata, Viewport } from "next";
import { Host_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import Analytics from "@/components/Analytics";
import QueryProvider from "@/store/QueryProvider";
import { siteDescription, siteName, siteTitle, siteUrl } from "@/content/site";
import "./globals.css";

const hostGrotesk = Host_Grotesk({
  variable: "--font-host-grotesk",
  subsets: ["latin"],
});

const shareImage = { url: "/og-image.jpg", width: 1200, height: 630, alt: siteTitle };

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: `%s · ${siteName}` },
  description: siteDescription,
  applicationName: siteName,
  alternates: { canonical: "/" },
  keywords: [
    "find lost pensions",
    "pension finder UK",
    "track old pensions",
    "life admin app",
    "organise finances in one place",
    "family financial organiser",
    "share accounts with family",
    "household finance app",
    "insurance renewal reminders",
    "estate planning UK",
  ],
  openGraph: {
    type: "website",
    siteName,
    locale: "en_GB",
    url: "/",
    title: siteTitle,
    description: siteDescription,
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [shareImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION && {
    verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  }),
};

export const viewport: Viewport = {
  themeColor: "#1c2c50",
};

/**
 * Reading the request headers renders every page per request, so the proxy's CSP nonce reaches every script Next
 * writes (it reads the nonce from the Content-Security-Policy request header).
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  await headers();
  return (
    <html lang="en-GB" className={`${hostGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full bg-ground text-ink">
        <QueryProvider>
          {children}
          <Analytics />
        </QueryProvider>
      </body>
    </html>
  );
}
