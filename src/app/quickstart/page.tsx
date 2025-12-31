import { Metadata } from "next";
import { QuickStartPage } from "@/components/pages/QuickStartPage";

export const metadata: Metadata = {
  title: "Quick Start Guide",
  description: "Get started with ServCraft in under 5 minutes. Learn how to install the CLI, initialize your project, and start your production-ready backend.",
  openGraph: {
    title: "ServCraft Quick Start Guide",
    description: "Launch your next Node.js project in minutes with our step-by-step Quick Start guide.",
    url: "https://servcraft.nexuscorporat.com/quickstart",
  },
  alternates: {
    canonical: "/quickstart",
  },
};

export default function Page() {
  return <QuickStartPage />;
}
