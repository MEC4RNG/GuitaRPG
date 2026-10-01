import { expect, test, type APIRequestContext } from "@playwright/test";

const mailUrl = process.env.SUPABASE_MAIL_URL ?? "http://127.0.0.1:54324";

function confirmationLink(html: string) {
  const decoded = html.replaceAll("&amp;", "&").replaceAll("&#x3D;", "=");
  return decoded.match(/https?:\/\/[^\s"'<>]+\/auth\/confirm\?[^\s"'<>]+/)?.[0] ?? null;
}

async function inbucketHtml(request: APIRequestContext, email: string) {
  const mailbox = encodeURIComponent(email.split("@")[0]);
  const list = await request.get(`${mailUrl}/api/v1/mailbox/${mailbox}`);
  if (!list.ok()) return null;
  const messages = (await list.json()) as Array<{ id?: string; ID?: string }>;
  if (!messages.length) return null;
  const detail = await request.get(
    `${mailUrl}/api/v1/mailbox/${mailbox}/${messages[0].id ?? messages[0].ID}`,
  );
  if (!detail.ok()) return null;
  const message = (await detail.json()) as {
    body?: { html?: string };
    HTML?: string;
    html?: string;
  };
  return message.body?.html ?? message.HTML ?? message.html ?? null;
}

async function mailpitHtml(request: APIRequestContext, email: string) {
  const list = await request.get(
    `${mailUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  );
  if (!list.ok()) return null;
  const result = (await list.json()) as { messages?: Array<{ ID?: string; id?: string }> };
  const message = result.messages?.[0];
  if (!message) return null;
  const detail = await request.get(`${mailUrl}/api/v1/message/${message.ID ?? message.id}`);
  if (!detail.ok()) return null;
  const body = (await detail.json()) as { HTML?: string; html?: string; Text?: string };
  return body.HTML ?? body.html ?? body.Text ?? null;
}

async function waitForEmailLink(
  request: APIRequestContext,
  email: string,
  type: "email_change" | "magiclink",
) {
  await expect
    .poll(
      async () => {
        const html =
          (await inbucketHtml(request, email)) ?? (await mailpitHtml(request, email)) ?? "";
        const link = confirmationLink(html);
        return link && new URL(link).searchParams.get("type") === type ? link : null;
      },
      { timeout: 15_000 },
    )
    .not.toBeNull();
  const html = (await inbucketHtml(request, email)) ?? (await mailpitHtml(request, email)) ?? "";
  const link = confirmationLink(html);
  if (!link || new URL(link).searchParams.get("type") !== type)
    throw new Error(`Local ${type} email did not contain a confirmation link`);
  return link;
}

test("guest warning, same-Player protection, sign-out, and passwordless recovery", async ({
  page,
  request,
}) => {
  const email = `data-003-browser-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;

  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Set your starting point." })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel("Experience background").selectOption("SOME_EXPERIENCE");
  await page.getByLabel("Typical session length (minutes)").fill("27");
  await page.getByLabel("Challenge preference").selectOption("BALANCED");
  await page.getByLabel("Preferred tuning").selectOption({ label: "Standard Tuning" });
  await page.getByRole("button", { name: "Save and continue" }).click();

  await expect(page.getByText("PLAYER READY")).toBeVisible();
  await expect(page.getByText("This guest Player is tied to this browser session")).toBeVisible();
  await expect(page.getByRole("button", { name: "Protect your progress" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue as guest" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);

  await page.getByRole("link", { name: "Continue as guest" }).click();
  await page.goto("/profile");
  await expect(page.getByText("Guest Player", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  await page.getByLabel("Display name (optional)").fill("Recovery Riff");
  await page.getByRole("button", { name: "Save Profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");

  await page.getByLabel("Email for recovery").fill(email);
  await page.getByRole("button", { name: "Protect your progress" }).click();
  await expect(
    page.getByText("Check your inbox to finish protecting this guest Player."),
  ).toBeVisible();
  const authFailures: string[] = [];
  page.on("response", async (response) => {
    if (!response.url().includes("/auth/v1/user") && !response.url().endsWith("/auth/identity"))
      return;
    if (response.status() < 400) {
      authFailures.push(`status-${response.status()}`);
      return;
    }
    const safeBody = (await response.text())
      .replaceAll(/[\w.+-]+@[\w.-]+/g, "[redacted-email]")
      .replaceAll(/eyJ[A-Za-z0-9._-]+/g, "[redacted-token]")
      .slice(0, 240);
    authFailures.push(`${response.status()}:${safeBody}`);
  });
  const guestOrigin = new URL(page.url()).origin;
  const sessionCookieShape = async () =>
    (await page.context().cookies())
      .filter((cookie) => cookie.name.includes("-auth-token"))
      .map(
        (cookie) =>
          `${cookie.name}:${cookie.domain}:${cookie.path}:${cookie.sameSite}:${cookie.secure}:${cookie.value.length}`,
      )
      .join(",");
  const sessionPayloadShape = async () => {
    const cookie = (await page.context().cookies()).find((candidate) =>
      candidate.name.endsWith("-auth-token"),
    );
    if (!cookie) return "absent";
    try {
      const encoded = cookie.value.startsWith("base64-") ? cookie.value.slice(7) : cookie.value;
      const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
      if (Array.isArray(payload)) return `array-${payload.length}`;
      if (payload && typeof payload === "object")
        return `object-${Object.keys(payload).sort().join("-")}`;
      return typeof payload;
    } catch {
      return "invalid";
    }
  };
  const guestSessionCookieShape = await sessionCookieShape();
  const guestSessionPayloadShape = await sessionPayloadShape();
  const upgradeLink = await waitForEmailLink(request, email, "email_change");
  expect(new URL(upgradeLink).origin).toBe(guestOrigin);
  await page.goto(upgradeLink);
  await expect(page).toHaveURL(/\/profile$/);
  const confirmedSessionCookieShape = await sessionCookieShape();
  const confirmedSessionPayloadShape = await sessionPayloadShape();
  await expect
    .poll(
      async () => {
        if (
          await page.getByRole("heading", { name: "Protected / recoverable account" }).isVisible()
        )
          return "protected";
        if (await page.getByRole("heading", { name: "Protect your progress" }).isVisible())
          return "guest";
        if (await page.getByRole("heading", { name: "Return to a protected Player" }).isVisible())
          return `unauthenticated:${await page.evaluate(() =>
            fetch("/auth/identity", { cache: "no-store" }).then((response) => response.text()),
          )}:cookies-before[${guestSessionCookieShape}|${guestSessionPayloadShape}]-after[${confirmedSessionCookieShape}|${confirmedSessionPayloadShape}]`;
        if (await page.getByText("Account status is unavailable").isVisible())
          return `auth-error:${authFailures.at(-1) ?? "no-response"}:cookies-before[${guestSessionCookieShape}|${guestSessionPayloadShape}]-after[${confirmedSessionCookieShape}|${confirmedSessionPayloadShape}]`;
        return "loading";
      },
      { timeout: 15_000 },
    )
    .toBe("protected");
  await expect(page.getByText(email, { exact: false })).toBeVisible();
  await expect(page.getByLabel("Display name (optional)")).toHaveValue("Recovery Riff");
  await expect(page.getByText("This guest Player is tied to this browser session")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Return to a protected Player" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start a new guest Player" })).toBeVisible();
  await page.getByLabel("Linked email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("If a linked GuitaRPG account exists");
  await page.goto(await waitForEmailLink(request, email, "magiclink"));
  await expect(
    page.getByRole("heading", { name: "Protected / recoverable account" }),
  ).toBeVisible();
  await expect(page.getByLabel("Display name (optional)")).toHaveValue("Recovery Riff");
});
