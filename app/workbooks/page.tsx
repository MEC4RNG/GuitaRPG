import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WorkbookPersistenceSurface } from "@/components/workbook-persistence-surface";

export const metadata: Metadata = { title: "Workbooks" };

export default function WorkbooksPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <WorkbookPersistenceSurface />;
}
