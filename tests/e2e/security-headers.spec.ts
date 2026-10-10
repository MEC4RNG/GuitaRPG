import { expect, test } from "@playwright/test";

const required = [
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
];

for (const path of ["/", "/profile", "/codex", "/codex/concepts/meter_5_4"]) {
  test(`release security headers protect ${path}`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    const headers = response.headers();
    for (const name of required) expect(headers[name], name).toBeTruthy();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).not.toContain("unsafe-eval");
    expect(headers["content-security-policy"]).not.toContain("connect-src *");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });
}

test("private account API errors retain security and no-store boundaries", async ({ request }) => {
  const exported = await request.get("/api/account/export");
  expect([401, 500, 503]).toContain(exported.status());
  expect(exported.headers()["cache-control"]).toContain("no-store");
  expect(exported.headers()["content-security-policy"]).not.toContain("unsafe-eval");

  const deleted = await request.post("/api/account/delete", {
    headers: { Origin: "https://attacker.invalid" },
    data: { confirmation: "DELETE" },
  });
  expect(deleted.status()).toBe(403);
  expect(deleted.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(deleted.headers()["access-control-allow-origin"]).toBeUndefined();
});
