import { Metadata } from "next";
import { ModulesPage } from "@/components/pages/ModulesPage";

export const metadata: Metadata = {
  title: "Pre-built Modules",
  description: "Explore 19+ battle-tested modules for ServCraft. Add authentication, redis cache, job queues, webhooks, and more with a single CLI command.",
  openGraph: {
    title: "ServCraft Modules Ecosystem",
    description: "Battle-tested, production-ready modules for your Node.js backend. Auth, Cache, Queues, and more.",
    url: "https://servcraft.nexuscorporat.com/modules",
  },
  alternates: {
    canonical: "/modules",
  },
};

export default function Page() {
  return <ModulesPage />;
}
