import { Metadata } from "next";
import { ArchitecturePage } from "@/components/pages/docs/ArchitecturePage";

export const metadata: Metadata = {
  title: "Architecture",
  description: "Learn about ServCraft's layered architecture, design patterns, and modular request flow for high-performance Node.js APIs.",
  alternates: {
    canonical: "/docs/architecture",
  },
};

export default function Page() {
  return <ArchitecturePage />;
}
