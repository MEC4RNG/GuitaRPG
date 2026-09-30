import type { Metadata } from "next";

import { TrainingSurface } from "@/components/training-surface";

export const metadata: Metadata = { title: "Training" };

export default function TrainingPage() {
  return <TrainingSurface />;
}
