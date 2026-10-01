import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

const MAIL_URL = process.env.SUPABASE_MAIL_URL ?? "http://127.0.0.1:54324";
const REDIRECT_TO = "http://localhost:3000/auth/confirm?next=/profile";

function localSupabase() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    };
  }
  const output = execFileSync("npx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const status = JSON.parse(output.slice(output.indexOf("{")));
  return { url: status.API_URL, key: status.PUBLISHABLE_KEY ?? status.ANON_KEY };
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function confirmationFromHtml(html) {
  const decoded = html.replaceAll("&amp;", "&").replaceAll("&#x3D;", "=");
  const match = decoded.match(/https?:\/\/[^\s"'<>]+\/auth\/confirm\?[^\s"'<>]+/);
  if (!match) return null;
  const link = new URL(match[0]);
  return {
    token_hash: link.searchParams.get("token_hash"),
    type: link.searchParams.get("type"),
  };
}

async function inbucketMessage(email) {
  const mailbox = encodeURIComponent(email.split("@")[0]);
  const list = await fetch(`${MAIL_URL}/api/v1/mailbox/${mailbox}`);
  if (!list.ok) return null;
  const messages = await list.json();
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const id = messages[0].id ?? messages[0].ID;
  const detail = await fetch(`${MAIL_URL}/api/v1/mailbox/${mailbox}/${id}`);
  if (!detail.ok) return null;
  const message = await detail.json();
  return message.body?.html ?? message.HTML ?? message.html ?? null;
}

async function mailpitMessage(email) {
  const list = await fetch(`${MAIL_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
  if (!list.ok) return null;
  const result = await list.json();
  const message = result.messages?.[0];
  if (!message) return null;
  const detail = await fetch(`${MAIL_URL}/api/v1/message/${message.ID ?? message.id}`);
  if (!detail.ok) return null;
  const body = await detail.json();
  return body.HTML ?? body.html ?? body.Text ?? null;
}

async function waitForConfirmation(email, expectedType) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const html = (await inbucketMessage(email)) ?? (await mailpitMessage(email));
    const confirmation = html && confirmationFromHtml(html);
    if (confirmation?.token_hash && confirmation.type === expectedType) return confirmation;
    await pause(250);
  }
  throw new Error(`Timed out waiting for local ${expectedType} email`);
}

function publicClient(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function main() {
  const { url, key } = localSupabase();
  assert.ok(url && key, "local public Supabase configuration is available");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `data-003-${suffix}@example.test`;
  const unknownEmail = `unknown-${suffix}@example.test`;
  const guest = publicClient(url, key);

  const { data: anonymousData, error: anonymousError } = await guest.auth.signInAnonymously();
  assert.ifError(anonymousError);
  const originalId = anonymousData.user?.id;
  assert.ok(originalId, "anonymous user has an Auth UUID");
  assert.equal(anonymousData.user?.is_anonymous, true);

  const { data: profileBefore, error: profileError } = await guest
    .from("player_profiles")
    .select("player_id,onboarding_status,experience_background,typical_session_minutes")
    .single();
  assert.ifError(profileError);
  assert.equal(profileBefore.player_id, originalId);

  const { data: tuning, error: tuningError } = await guest
    .from("taxonomy_entities")
    .select("id")
    .eq("kind", "CONTEXT")
    .eq("slug", "standard_tuning")
    .single();
  assert.ifError(tuningError);
  const { error: onboardingError } = await guest.rpc("complete_player_onboarding", {
    p_experience_background: "SOME_EXPERIENCE",
    p_typical_session_minutes: 23,
    p_challenge_preference: "BALANCED",
    p_calibration_status: "SKIPPED",
    p_tuning_context_id: tuning.id,
    p_goal: "DATA-003 identity continuity",
  });
  assert.ifError(onboardingError);

  const { error: linkError } = await guest.auth.updateUser(
    { email },
    { emailRedirectTo: REDIRECT_TO },
  );
  assert.ifError(linkError);
  const upgrade = await waitForConfirmation(email, "email_change");
  const { data: upgradedData, error: upgradeError } = await guest.auth.verifyOtp(upgrade);
  assert.ifError(upgradeError);
  assert.equal(upgradedData.user?.id, originalId, "guest upgrade preserves the Auth UUID");
  assert.equal(upgradedData.user?.is_anonymous, false);
  assert.equal(upgradedData.user?.email, email);

  const { data: profileAfterUpgrade, error: upgradedProfileError } = await guest
    .from("player_profiles")
    .select("player_id,onboarding_status,experience_background,typical_session_minutes")
    .single();
  assert.ifError(upgradedProfileError);
  assert.deepEqual(profileAfterUpgrade, {
    player_id: originalId,
    onboarding_status: "COMPLETE",
    experience_background: "SOME_EXPERIENCE",
    typical_session_minutes: 23,
  });

  const { error: signOutError } = await guest.auth.signOut();
  assert.ifError(signOutError);
  const recovered = publicClient(url, key);
  const { error: requestError } = await recovered.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: REDIRECT_TO },
  });
  assert.ifError(requestError);
  const login = await waitForConfirmation(email, "magiclink");
  const { data: recoveredData, error: recoveredError } = await recovered.auth.verifyOtp(login);
  assert.ifError(recoveredError);
  assert.equal(recoveredData.user?.id, originalId, "return login restores the original Auth UUID");

  const { data: restoredProfile, error: restoredError } = await recovered
    .from("player_profiles")
    .select("player_id,onboarding_status,experience_background,typical_session_minutes")
    .single();
  assert.ifError(restoredError);
  assert.deepEqual(restoredProfile, profileAfterUpgrade);

  const unknown = publicClient(url, key);
  const { data: unknownData, error: unknownError } = await unknown.auth.signInWithOtp({
    email: unknownEmail,
    options: { shouldCreateUser: false, emailRedirectTo: REDIRECT_TO },
  });
  assert.ok(unknownError, "unknown returning email is rejected when account creation is disabled");
  assert.equal(unknownData.user, null);
  assert.equal(unknownData.session, null);
  const { data: unknownSession } = await unknown.auth.getSession();
  assert.equal(unknownSession.session, null);

  console.log(
    "DATA-003 local Auth integration PASS: same UUID, durable state, recovery, no-create",
  );
}

try {
  await main();
} catch (error) {
  const diagnostic = String(error?.stack ?? error)
    .replaceAll(/token_hash=[^&\s]+/gi, "token_hash=[redacted]")
    .replaceAll(/[\w.+-]+@[\w.-]+/g, "[redacted-email]")
    .replaceAll(/eyJ[A-Za-z0-9._-]+/g, "[redacted-token]")
    .replaceAll("\n", "%0A");
  console.error(`::error title=DATA-003 local Auth integration::${diagnostic}`);
  process.exitCode = 1;
}
