"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "./page-header";
import {
  readProfileSnapshot,
  saveProfileSnapshot,
  type ProfileClient,
  type ProfileGoal,
  type ProfileGoalKind,
  type ProfileSnapshot,
} from "@/lib/profile/repository";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

import { AccountRecoveryPanel } from "./account-recovery-panel";

const profileClient = () => createBrowserSupabaseClient() as unknown as ProfileClient;
const newGoal = (): ProfileGoal => ({ id: null, kind: "SKILL", targetId: null, objective: "" });

export function ProfileSurface() {
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [pending, setPending] = useState<"LOADING" | "SAVING" | null>("LOADING");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setPending("LOADING");
    setError("");
    try {
      setProfile(await readProfileSnapshot(profileClient()));
    } catch {
      setError("Profile data is unavailable. Please try again.");
    } finally {
      setPending(null);
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  function update(values: Partial<ProfileSnapshot>) {
    setProfile((current) => (current ? { ...current, ...values } : current));
    setMessage("");
  }

  function updateGoal(index: number, values: Partial<ProfileGoal>) {
    if (!profile) return;
    const goals = profile.goals.map((goal, current) =>
      current === index ? { ...goal, ...values } : goal,
    );
    update({ goals });
  }

  async function save() {
    if (!profile || pending) return;
    setPending("SAVING");
    setError("");
    setMessage("");
    try {
      await saveProfileSnapshot(profileClient(), profile);
      setProfile(await readProfileSnapshot(profileClient()));
      setMessage("Profile saved. Future Training reads will use these preferences.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Profile could not be saved.");
    } finally {
      setPending(null);
    }
  }

  if (pending === "LOADING" && !profile)
    return (
      <p className="session-notice" role="status">
        Loading your Player Profile…
      </p>
    );
  if (!profile)
    return (
      <p className="session-notice" role="alert">
        {error || "Profile is unavailable."}
      </p>
    );
  if (!profile.authenticated || !profile.initialized)
    return (
      <div className="profile-stack">
        <PageHeader
          eyebrow="SYSTEM · PROFILE"
          title="Access your Player."
          description="Sign in to an existing protected Player or start a new guest Player."
        />
        <AccountRecoveryPanel />
      </div>
    );
  if (profile.onboardingStatus !== "COMPLETE")
    return (
      <div className="profile-stack">
        <section className="panel profile-setup">
          <PageHeader
            eyebrow="SYSTEM · PROFILE"
            title="Finish Player setup."
            description="Complete first-run setup before editing your ongoing practice preferences."
          />
          <Link className="action-button action-button--primary" href="/onboarding">
            Continue setup
          </Link>
        </section>
        <AccountRecoveryPanel />
      </div>
    );

  return (
    <div className="profile-stack">
      <PageHeader
        eyebrow="SYSTEM · PROFILE"
        title="Your practice preferences."
        description="Review the Player-owned inputs that shape future Training without changing earned progression."
      />

      <AccountRecoveryPanel />

      <section className="panel profile-form" aria-labelledby="profile-preferences-title">
        <div>
          <p className="eyebrow">PRACTICE PREFERENCES</p>
          <h2 id="profile-preferences-title">How you want to practice</h2>
        </div>
        <label>
          Display name (optional)
          <input
            value={profile.displayName}
            onChange={(event) => update({ displayName: event.target.value })}
          />
        </label>
        <label>
          Experience background
          <select
            value={profile.experienceBackground}
            onChange={(event) => update({ experienceBackground: event.target.value })}
          >
            <option value="UNSPECIFIED">Prefer not to say</option>
            <option value="NEW_TO_GUITAR">New to guitar</option>
            <option value="SOME_EXPERIENCE">Some experience</option>
            <option value="EXPERIENCED">Experienced</option>
          </select>
          <small>Changing this does not award progress or directly change Skill proficiency.</small>
        </label>
        <label>
          Typical session length (minutes)
          <input
            min="1"
            max="1440"
            type="number"
            value={profile.typicalSessionMinutes ?? ""}
            onChange={(event) =>
              update({
                typicalSessionMinutes: event.target.value ? Number(event.target.value) : null,
              })
            }
          />
          <small>
            Saved as your typical practice duration; automatic Training-duration adaptation is not
            yet applied.
          </small>
        </label>
        <label>
          Challenge preference
          <select
            value={profile.challengePreference}
            onChange={(event) => update({ challengePreference: event.target.value })}
          >
            <option value="RELAXED">Relaxed</option>
            <option value="BALANCED">Balanced</option>
            <option value="CHALLENGE">Challenge me</option>
            <option value="PUSH_ME">Push me</option>
          </select>
          <small>
            This shapes a concrete Training Quest after target selection; it does not change Skill
            ranking.
          </small>
        </label>
        <label>
          Default tuning
          <select
            value={profile.defaultTuningContextId ?? ""}
            onChange={(event) => update({ defaultTuningContextId: event.target.value || null })}
          >
            <option value="">No default tuning</option>
            {profile.tunings.map((tuning) => (
              <option key={tuning.id} value={tuning.id}>
                {tuning.name}
              </option>
            ))}
          </select>
          <small>This affects future Training Quests, never historical Quests or Sessions.</small>
        </label>
      </section>

      <section className="panel profile-goals" aria-labelledby="profile-goals-title">
        <div>
          <p className="eyebrow">PRACTICE GOALS</p>
          <h2 id="profile-goals-title">What matters to you</h2>
          <p>Structured Skill and Domain goals inform current Training signals.</p>
        </div>
        {profile.goals.map((goal, index) => (
          <fieldset className="profile-goal" key={goal.id ?? `new-${index}`}>
            <legend>Goal {index + 1}</legend>
            <label>
              Goal type
              <select
                value={goal.kind}
                onChange={(event) =>
                  updateGoal(index, {
                    kind: event.target.value as ProfileGoalKind,
                    targetId: null,
                    objective: "",
                  })
                }
              >
                <option value="SKILL">Skill</option>
                <option value="DOMAIN">Domain</option>
                <option value="OBJECTIVE">Practice note</option>
              </select>
            </label>
            {goal.kind === "OBJECTIVE" ? (
              <label>
                Practice note
                <input
                  value={goal.objective}
                  onChange={(event) => updateGoal(index, { objective: event.target.value })}
                />
                <small>
                  Practice notes are saved but do not affect Training priority until mapped to a
                  structured Skill or Domain.
                </small>
              </label>
            ) : (
              <label>
                {goal.kind === "SKILL" ? "Skill" : "Domain"}
                <select
                  value={goal.targetId ?? ""}
                  onChange={(event) => updateGoal(index, { targetId: event.target.value || null })}
                >
                  <option value="">Choose {goal.kind === "SKILL" ? "a Skill" : "a Domain"}</option>
                  {(goal.kind === "SKILL" ? profile.skills : profile.domains).map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              className="action-button action-button--secondary"
              type="button"
              onClick={() =>
                update({ goals: profile.goals.filter((_, current) => current !== index) })
              }
            >
              Remove goal
            </button>
          </fieldset>
        ))}
        <button
          className="action-button action-button--secondary"
          type="button"
          onClick={() => update({ goals: [...profile.goals, newGoal()] })}
        >
          Add goal
        </button>
      </section>

      <section className="panel profile-state" aria-labelledby="profile-state-title">
        <div>
          <p className="eyebrow">PLAYER STATE</p>
          <h2 id="profile-state-title">Progress remains evidence-derived</h2>
        </div>
        <p>
          Calibration: <strong>{profile.calibrationStatus.replaceAll("_", " ")}</strong>. Profile
          edits never grant XP, proficiency, confidence, readiness, Skill Levels, Attributes, or
          mastery.
        </p>
      </section>

      {error ? (
        <p className="session-notice training-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="session-notice" role="status">
          {message}
        </p>
      ) : null}
      <button
        className="action-button action-button--primary profile-save"
        type="button"
        disabled={pending !== null}
        onClick={() => void save()}
      >
        {pending === "SAVING" ? "Saving Profile…" : "Save Profile"}
      </button>
    </div>
  );
}
