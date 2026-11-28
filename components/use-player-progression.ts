"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Client = ReturnType<typeof createBrowserSupabaseClient>;
type State<T> = { kind: "loading" | "visitor" | "setup" | "error" } | { kind: "player"; value: T };

async function getIdentity(client: Client) {
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") throw new Error("Identity unavailable");
  return data.user;
}

/** Do not query private progression or refresh readiness for visitors. */
export function usePlayerProgression<T>(read: (client: Client) => Promise<T>) {
  const [state, setState] = useState<State<T>>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const client = createBrowserSupabaseClient();
    let active = true;
    let generation = 0;
    let owner: string | null | undefined;
    const load = async () => {
      const request = ++generation;
      const publish = (next: State<T>) => {
        if (active && request === generation) setState(next);
      };
      publish({ kind: "loading" });
      try {
        const identity = await getIdentity(client);
        if (!identity) return publish({ kind: "visitor" });
        const profile = await client
          .from("player_profiles")
          .select("onboarding_status")
          .eq("player_id", identity.id)
          .maybeSingle();
        if (profile.error) throw new Error("Player profile unavailable");
        if (profile.data?.onboarding_status !== "COMPLETE") return publish({ kind: "setup" });
        const value = await read(client);
        if ((await getIdentity(client))?.id !== identity.id) throw new Error("Player changed");
        publish({ kind: "player", value });
      } catch {
        publish({ kind: "error" });
      }
    };
    let timer = window.setTimeout(() => void load(), 0);
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        owner = session?.user.id ?? null;
        return;
      }
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      const next = session?.user.id ?? null;
      if (event !== "USER_UPDATED" && owner === next) return;
      owner = next;
      generation++;
      setState({ kind: "loading" });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 0);
    });
    return () => {
      active = false;
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, [attempt, read]);
  return { state, retry: () => setAttempt((value) => value + 1) };
}
