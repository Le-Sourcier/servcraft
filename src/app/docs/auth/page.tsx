import { Metadata } from "next";
import { AuthPage } from "@/components/pages/docs/AuthPage";

export const metadata: Metadata = {
  title: "Authentication",
  description: "Learn how to implement secure JWT authentication, role-based access control (RBAC), and MFA in your ServCraft application.",
  alternates: {
    canonical: "/docs/auth",
  },
};

export default function Page() {
  return <AuthPage />;
}
