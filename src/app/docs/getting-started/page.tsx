import { Metadata } from "next";
import { GettingStartedPage } from "@/components/pages/docs/GettingStartedPage";

export const metadata: Metadata = {
  title: "Getting Started",
  description: "Learn how to install ServCraft and create your first production-ready Node.js backend in minutes.",
  alternates: {
    canonical: "/docs/getting-started",
  },
};

export default function Page() {
  return <GettingStartedPage />;
}
