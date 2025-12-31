import { Metadata } from "next";
import { CliPage } from "@/components/pages/CliPage";

export const metadata: Metadata = {
  title: "CLI Reference",
  description: "Master the ServCraft CLI. Complete command reference for initializing projects, adding modules, and scaffolding production-ready backends.",
  openGraph: {
    title: "ServCraft CLI Reference",
    description: "Complete command reference for the ServCraft CLI. Project initialization, module management, and more.",
    url: "https://servcraft.nexuscorporat.com/cli",
  },
  alternates: {
    canonical: "/cli",
  },
};

export default function Page() {
  return <CliPage />;
}
