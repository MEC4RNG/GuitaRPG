"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { completeOnboarding, type OnboardingRpcClient } from "@/lib/onboarding/completion";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

import { AccountRecoveryPanel } from "./account-recovery-panel";

type Tuning = { id: string; display_name: string; slug: string };
type Profile = {
  onboarding_status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";
  calibration_status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" | "SKIPPED";
};

// PLY-002 is the typed database authority. Generated project types are intentionally
// deferred; this narrow adapter keeps ONB-001 limited to explicitly editable tables.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createBrowserSupabaseClient() as any;

export function OnboardingFlow() {
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");
  const [tunings, setTunings] = useState<Tuning[]>([]);
  const [experience, setExperience] = useState("UNSPECIFIED");
  const [minutes, setMinutes] = useState("20");
  const [challenge, setChallenge] = useState("BALANCED");
  const [tuningId, setTuningId] = useState("");
  const [goal, setGoal] = useState("");
  const [calibration, setCalibration] = useState<"SKIPPED" | "IN_PROGRESS">("SKIPPED");

  useEffect(() => {
    const load = async () => {
      const supabase = db();
      let { data } = await supabase.auth.getUser();
      if (!data.user) {
        const anonymous = await supabase.auth.signInAnonymously();
        data = { user: anonymous.data.user };
      }
      if (!data.user) {
        setMessage("We could not create a private Player session. Please try again.");
        return;
      }
      const [profileResult, tuningResult] = await Promise.all([
        supabase
          .from("player_profiles")
          .select(
            "onboarding_status, calibration_status, experience_background, typical_session_minutes, challenge_preference",
          )
          .eq("player_id", data.user.id)
          .single(),
        supabase
          .from("taxonomy_entities")
          .select("id, display_name, slug")
          .eq("kind", "CONTEXT")
          .eq("lifecycle", "ACTIVE")
          .eq("metadata->>context_family", "TUNING")
          .order("display_name"),
      ]);
      const profile = profileResult.data as
        (Profile & Record<string, string | number | null>) | null;
      if (profile?.onboarding_status === "COMPLETE") {
        setComplete(true);
      } else {
        await supabase
          .from("player_profiles")
          .update({ onboarding_status: "IN_PROGRESS" })
          .eq("player_id", data.user.id);
        setExperience(String(profile?.experience_background ?? "UNSPECIFIED"));
        setMinutes(String(profile?.typical_session_minutes ?? 20));
        setChallenge(String(profile?.challenge_preference ?? "BALANCED"));
      }
      const rows = (tuningResult.data ?? []) as Tuning[];
      setTunings(rows);
      setTuningId(rows.find((row) => row.slug === "standard_tuning")?.id ?? rows[0]?.id ?? "");
      setReady(true);
    };
    void load();
  }, []);

  const finish = async () => {
    if (!tuningId) return setMessage("Choose a preferred tuning before continuing.");
    setMessage("Saving your Player setup…");
    const result = await completeOnboarding(db() as OnboardingRpcClient, {
      experienceBackground: experience,
      typicalSessionMinutes: Number(minutes) || null,
      challengePreference: challenge,
      calibrationStatus: calibration,
      tuningContextId: tuningId,
      goal,
    });
    if (!result.complete) return setMessage(result.error);
    setMessage("");
    setComplete(true);
  };

  if (!ready) return <p className="onboarding__loading">Preparing your private Player setup…</p>;
  if (complete) {
    return (
      <section className="onboarding">
        <span className="panel__label">PLAYER READY</span>
        <h1>Welcome to GuitaRPG.</h1>
        <p>
          Your preferences are saved. Skills remain UNRATED until future practice evidence or an
          honest diagnostic can assess them.
        </p>
        <AccountRecoveryPanel onboarding />
      </section>
    );
  }
  return (
    <section className="onboarding">
      <span className="panel__label">FIRST-RUN SETUP</span>
      <h1>Set your starting point.</h1>
      <p>
        These choices personalize future practice. They do not rate your ability or award progress.
      </p>
      <div className="onboarding__grid">
        <label>
          Experience background
          <select value={experience} onChange={(event) => setExperience(event.target.value)}>
            <option value="UNSPECIFIED">Prefer not to say</option>
            <option value="NEW_TO_GUITAR">New to guitar</option>
            <option value="SOME_EXPERIENCE">Some experience</option>
            <option value="EXPERIENCED">Experienced</option>
          </select>
        </label>
        <label>
          Typical session length (minutes)
          <input
            min="1"
            max="1440"
            type="number"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </label>
        <label>
          Challenge preference
          <select value={challenge} onChange={(event) => setChallenge(event.target.value)}>
            <option value="RELAXED">Relaxed</option>
            <option value="BALANCED">Balanced</option>
            <option value="CHALLENGE">Challenge me</option>
            <option value="PUSH_ME">Push me</option>
          </select>
        </label>
        <label>
          Preferred tuning
          <select value={tuningId} onChange={(event) => setTuningId(event.target.value)}>
            {tunings.map((tuning) => (
              <option key={tuning.id} value={tuning.id}>
                {tuning.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="onboarding__wide">
          A practice goal (optional)
          <input
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="For example: play more confidently with a metronome"
          />
        </label>
      </div>
      <fieldset>
        <legend>Calibration</legend>
        <p>
          Diagnostics arrive with the future Quest and evidence systems. You can choose a future
          calibration path without inventing a rating now.
        </p>
        <label>
          <input
            checked={calibration === "SKIPPED"}
            name="calibration"
            onChange={() => setCalibration("SKIPPED")}
            type="radio"
          />{" "}
          Skip for now — keep every Skill UNRATED
        </label>
        <label>
          <input
            checked={calibration === "IN_PROGRESS"}
            name="calibration"
            onChange={() => setCalibration("IN_PROGRESS")}
            type="radio"
          />{" "}
          Set up calibration for later
        </label>
      </fieldset>
      <div className="hero__actions">
        <button
          className="action-button action-button--primary"
          onClick={() => void finish()}
          type="button"
        >
          Save and continue
        </button>
        <Link className="action-button action-button--secondary" href="/">
          Back
        </Link>
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
