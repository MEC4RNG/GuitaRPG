import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WorkbookPersistenceSurface } from "@/components/workbook-persistence-surface";

export const metadata: Metadata = { title: "Workbooks" };

export default async function WorkbooksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { parseWorkbookRouteContext } = await import("@/lib/workbook/context");
  return <WorkbookPersistenceSurface context={parseWorkbookRouteContext(await searchParams)} />;
}
