import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import {
  canAccessStudioAtlasPreview,
  useStudioAtlasShellPreview,
} from "@/lib/ux/studio-atlas-preview";

import "./globals.css";
import "./workbook-workspace.css";
import "./studio-atlas.css";
import "./studio-atlas-home.css";
import "./studio-atlas-shell.css";
import "./studio-atlas-mec.css";

export const metadata: Metadata = {
  title: {
    default: "Sound Uncharted",
    template: "%s · Sound Uncharted",
  },
  description:
    "Sound Uncharted turns guitar practice into musical quests, learning, and exploration.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell
          atlasAvailable={canAccessStudioAtlasPreview()}
          atlasDefault={useStudioAtlasShellPreview()}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
