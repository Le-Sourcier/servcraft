"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export function DocsLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDocsPage = pathname.startsWith("/docs");
  const isPlaygroundPage = pathname === "/playground";
  const isModulesPage = pathname === "/modules";

  if (isDocsPage || isPlaygroundPage) {
    // Docs and Playground pages have their own layout - no navbar/footer
    return <>{children}</>;
  }

  // For other pages (home, quickstart, cli, modules), show navbar/footer
  return (
    <>
      <Navbar />
      <main className={isModulesPage ? "flex-1" : "flex-1 pt-16"}>
        {children}
      </main>
      {!isModulesPage && <Footer />}
    </>
  );
}
