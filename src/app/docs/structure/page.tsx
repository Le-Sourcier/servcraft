import { Metadata } from "next";
import { StructurePage } from "@/components/pages/docs/StructurePage";

export const metadata: Metadata = {
  title: "Project Structure",
  description: "Understand the ServCraft project layout, file conventions, and modular architecture for building scalable Node.js backends.",
  alternates: {
    canonical: "/docs/structure",
  },
};

export default function Page() {
  return <StructurePage />;
}
