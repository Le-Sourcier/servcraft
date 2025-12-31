import { Metadata } from "next";
import { ConfigurationPage } from "@/components/pages/docs/ConfigurationPage";

export const metadata: Metadata = {
  title: "Configuration",
  description: "Comprehensive guide to configuring your ServCraft project using servcraft.config.json and environment variables.",
  alternates: {
    canonical: "/docs/configuration",
  },
};

export default function Page() {
  return <ConfigurationPage />;
}
