import assert from "node:assert/strict";

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3250";
assert.ok(url && publicKey && secretKey, "Supabase integration environment is required");

const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
const admin = createClient(url, secretKey, options);
const publicClient = () => createClient(url, publicKey, options);
const created = new Set();

async function api(path, accessToken, init = {}) {
  return fetch(`${appUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      origin: appUrl,
      ...(init.headers ?? {}),
    },
  });
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `data-004-${suffix}@example.test`;
  const password = `Data004-${suffix}-A!`;
  const { count: canonicalBefore, error: canonicalBeforeError } = await admin
    .from("taxonomy_entities")
    .select("id", { count: "exact", head: true });
  assert.ifError(canonicalBeforeError);

  const { data: otherData, error: otherError } = await admin.auth.admin.createUser({
    email: `data-004-other-${suffix}@example.test`,
    password,
    email_confirm: true,
  });
  assert.ifError(otherError);
  created.add(otherData.user.id);

  const { data: createdData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(createError);
  created.add(createdData.user.id);
  const playerId = createdData.user.id;

  const client = publicClient();
  const { data: signIn, error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  assert.ifError(signInError);
  const token = signIn.session?.access_token;
  assert.ok(token);
  const { error: profileError } = await client
    .from("player_profiles")
    .update({ display_name: "DATA-004 Integration" })
    .eq("player_id", playerId);
  assert.ifError(profileError);

  const { data: directSnapshot, error: directExportError } =
    await client.rpc("export_player_data_v1");
  assert.ifError(directExportError);
  assert.equal(directSnapshot.export_version, "GUITARPG_PLAYER_EXPORT_V1");

  const exportResponse = await api("/api/account/export", token);
  assert.equal(exportResponse.status, 200);
  assert.match(exportResponse.headers.get("content-disposition") ?? "", /attachment/);
  assert.match(exportResponse.headers.get("cache-control") ?? "", /no-store/);
  const snapshot = await exportResponse.json();
  assert.equal(snapshot.export_version, "GUITARPG_PLAYER_EXPORT_V1");
  assert.equal(snapshot.identity.player_id, playerId);
  assert.equal(snapshot.identity.email, email);
  assert.equal(snapshot.profile.display_name, "DATA-004 Integration");
  assert.ok(snapshot.progression.skills.every((row) => row.player_id === playerId));
  assert.ok(!("skill_progression_baselines" in snapshot));

  const foreignTarget = await api("/api/account/delete", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirmation: "DELETE", player_id: otherData.user.id }),
  });
  assert.equal(foreignTarget.status, 400);
  const crossOrigin = await fetch(`${appUrl}/api/account/delete`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      origin: "https://attacker.invalid",
      "content-type": "application/json",
    },
    body: JSON.stringify({ confirmation: "DELETE" }),
  });
  assert.equal(crossOrigin.status, 403);

  const deletion = await api("/api/account/delete", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirmation: "DELETE" }),
  });
  assert.equal(deletion.status, 200);
  created.delete(playerId);
  const { data: deletedUser } = await admin.auth.admin.getUserById(playerId);
  assert.equal(deletedUser.user, null);
  const { count: profileCount, error: profileCountError } = await admin
    .from("player_profiles")
    .select("player_id", { count: "exact", head: true })
    .eq("player_id", playerId);
  assert.ifError(profileCountError);
  assert.equal(profileCount, 0);
  const { data: survivingOther, error: survivingError } = await admin.auth.admin.getUserById(
    otherData.user.id,
  );
  assert.ifError(survivingError);
  assert.equal(survivingOther.user?.id, otherData.user.id);

  const guest = publicClient();
  const { data: guestData, error: guestError } = await guest.auth.signInAnonymously();
  if (
    guestError?.code === "anonymous_provider_disabled" &&
    process.env.REQUIRE_GUEST_DELETE !== "true"
  ) {
    console.log(
      "DATA-004 staging note: guest deletion skipped because anonymous Auth is disabled remotely",
    );
  } else {
    assert.ifError(guestError);
    const guestId = guestData.user?.id;
    const guestToken = guestData.session?.access_token;
    assert.ok(guestId && guestToken);
    created.add(guestId);
    const guestExport = await api("/api/account/export", guestToken);
    assert.equal(guestExport.status, 403);
    const guestDeletion = await api("/api/account/delete", guestToken, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });
    assert.equal(guestDeletion.status, 200);
    created.delete(guestId);
  }

  const { count: canonicalAfter, error: canonicalAfterError } = await admin
    .from("taxonomy_entities")
    .select("id", { count: "exact", head: true });
  assert.ifError(canonicalAfterError);
  assert.equal(canonicalAfter, canonicalBefore, "canonical content survives account deletion");
  console.log("DATA-004 integration PASS: export isolation, abuse rejection, and hard deletion");
}

try {
  await main();
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id, false);
}
