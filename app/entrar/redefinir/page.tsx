import type { Metadata } from "next";
import RedefinirView from "@/components/auth/RedefinirView";

export const metadata: Metadata = { title: "Nova senha — LOLA", robots: { index: false } };

export default function RedefinirPage() {
  return <RedefinirView />;
}
