import { Metadata } from "next";
import { DocsPage } from "@/components/pages/docs/DocsPage";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Comprehensive guides, CLI reference, and API documentation for the ServCraft framework. Everything you need to build modular Node.js backends.",
  openGraph: {
    title: "ServCraft Documentation",
    description: "Learn how to build production-ready Node.js backends with ServCraft.",
    url: "https://servcraft.nexuscorporat.com/docs",
  },
  alternates: {
    canonical: "/docs",
  },
};

export default function Page() {
  return <DocsPage />;
}
