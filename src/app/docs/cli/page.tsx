import { Metadata } from "next";
import { CLIPage } from "@/components/pages/docs/CLIPage";

export const metadata: Metadata = {
  title: "CLI Reference",
  description: "Complete reference guide for the ServCraft CLI. Initialize projects, add modules, scaffold resources, and manage your backend from the terminal.",
  alternates: {
    canonical: "/docs/cli",
  },
};

export default function Page() {
  return <CLIPage />;
}
