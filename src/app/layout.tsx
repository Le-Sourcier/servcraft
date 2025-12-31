import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DocsLayoutWrapper } from "@/components/DocsLayoutWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ServCraft - Modular Node.js Backend Framework",
  description: "A modular, production-ready Node.js backend framework built with TypeScript, Fastify, and Prisma. Generate production-ready backends in minutes.",
  keywords: ["Node.js", "Backend", "Framework", "Fastify", "TypeScript", "Prisma", "CLI", "ServCraft"],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
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
        <DocsLayoutWrapper>{children}</DocsLayoutWrapper>
      </body>
    </html>
  );
}
