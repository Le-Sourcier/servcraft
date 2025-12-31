import { Metadata } from "next";
import { HomePage } from "@/components/pages/HomePage";

export const metadata: Metadata = {
  title: "ServCraft - Modular Node.js Backend Framework",
  description: "Generate production-ready Node.js backends in minutes. Modular architecture with Fastify, Prisma, and a powerful CLI. Built for speed and scalability.",
  openGraph: {
    title: "ServCraft - Modular Node.js Backend Framework",
    description: "Generate production-ready Node.js backends in minutes. Modular architecture with Fastify, Prisma, and a powerful CLI.",
    url: "https://servcraft.nexuscorporat.com",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <HomePage />;
}
