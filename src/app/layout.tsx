import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DocsLayoutWrapper } from "@/components/DocsLayoutWrapper";
import JsonLd from "@/components/JsonLd";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteConfig = {
  name: "ServCraft",
  description: "A modular, production-ready Node.js backend framework built with TypeScript, Fastify, and Prisma. Generate production-ready backends in minutes.",
  url: "https://servcraft.nexuscorporat.com",
  ogImage: "https://servcraft.nexuscorporat.com/logo.png",
  keywords: ["Node.js", "Backend", "Framework", "Fastify", "TypeScript", "Prisma", "CLI", "ServCraft", "API"],
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - Modular Node.js Backend Framework`,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: "Le Sourcier", url: "https://github.com/Le-Sourcier" }],
  creator: "Le Sourcier",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [{
      url: "/logo.png",
      width: 1200,
      height: 630,
      alt: siteConfig.name,
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/logo.png"],
    creator: "@LeSourcier",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": siteConfig.name,
            "description": siteConfig.description,
            "applicationCategory": "DeveloperApplication",
            "operatingSystem": "Node.js, Linux, macOS, Windows",
            "url": siteConfig.url,
            "image": siteConfig.ogImage,
            "author": {
              "@type": "Person",
              "name": "Le Sourcier"
            }
          }}
        />
        <DocsLayoutWrapper>{children}</DocsLayoutWrapper>
      </body>
    </html>
  );
}
