import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WorkbookEditorPrototype } from "@/components/workbook-editor-prototype";

export const metadata: Metadata = { title: "Workbook Editor Prototype" };

export default function WorkbookPrototypePage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <WorkbookEditorPrototype />;
}
