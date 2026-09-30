import type { Metadata } from "next";

import { ProfileSurface } from "@/components/profile-surface";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return <ProfileSurface />;
}
