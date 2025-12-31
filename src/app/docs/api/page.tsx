import { Metadata } from "next";
import { APIReferencePage } from "@/components/pages/docs/APIReferencePage";

export const metadata: Metadata = {
  title: "API Reference",
  description: "Detailed API documentation for all ServCraft services, including AuthService, UserService, CacheService, and more.",
  alternates: {
    canonical: "/docs/api",
  },
};

export default function Page() {
  return <APIReferencePage />;
}
