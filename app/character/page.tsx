import type { Metadata } from "next";

import { CharacterProgressionSurface } from "@/components/character-progression-surface";

export const metadata: Metadata = { title: "Character" };

export default function CharacterPage() {
  return <CharacterProgressionSurface />;
}
