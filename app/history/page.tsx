import type { Metadata } from "next";
import { HistorySurface } from "@/components/history-surface";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return <HistorySurface />;
}
