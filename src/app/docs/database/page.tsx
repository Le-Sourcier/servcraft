import { Metadata } from "next";
import { DatabasePage } from "@/components/pages/docs/DatabasePage";

export const metadata: Metadata = {
  title: "Database",
  description: "Learn how to configure databases, manage schemas with Prisma, and run migrations in your ServCraft project.",
  alternates: {
    canonical: "/docs/database",
  },
};

export default function Page() {
  return <DatabasePage />;
}
