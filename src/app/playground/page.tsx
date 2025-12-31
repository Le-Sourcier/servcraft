import { Metadata } from "next";
import { PlaygroundPage } from "@/components/pages/PlaygroundPage";

export const metadata: Metadata = {
  title: "Interactive Playground",
  description: "Test ServCraft directly in your browser. Write code, run npm commands, and see results instantly in a sandboxed Docker environment.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <PlaygroundPage />;
}
