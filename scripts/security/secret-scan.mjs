import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

const textExtensions = new Set([
  "",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const detectors = [
  ["supabase-secret-key", /sb_secret_[A-Za-z0-9_-]{20,}/g],
  ["github-token", /gh[pousr]_[A-Za-z0-9]{30,}/g],
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["aws-access-key", /AKIA[0-9A-Z]{16}/g],
  ["google-api-key", /AIza[0-9A-Za-z_-]{35}/g],
  ["slack-token", /xox[baprs]-[0-9A-Za-z-]{20,}/g],
];
const jwtPattern = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function jwtServiceRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

export function scanText(text, location) {
  const findings = [];
  for (const [kind, pattern] of detectors) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern))
      findings.push({ kind, location, fingerprint: fingerprint(match[0]) });
  }
  jwtPattern.lastIndex = 0;
  for (const match of text.matchAll(jwtPattern))
    if (jwtServiceRole(match[0]))
      findings.push({
        kind: "supabase-service-role-jwt",
        location,
        fingerprint: fingerprint(match[0]),
      });
  return findings;
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

function scanSource() {
  return git("ls-files", "-z")
    .split("\0")
    .filter(Boolean)
    .flatMap((path) => {
      try {
        return scanText(readFileSync(path, "utf8"), path);
      } catch {
        return [];
      }
    });
}

function scanHistory() {
  const findings = [];
  const commits = git("log", "--all", "--format=%H").trim().split(/\r?\n/);
  const candidatePattern =
    "sb_secret_|gh[pousr]_|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]|AIza|xox[baprs]-|eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}";
  for (const commit of commits) {
    let matches = "";
    try {
      matches = git("grep", "-I", "-n", "-E", candidatePattern, commit, "--");
    } catch (error) {
      if (error?.status === 1) continue;
      throw error;
    }
    for (const line of matches.split(/\r?\n/).filter(Boolean)) {
      const first = line.indexOf(":");
      const second = line.indexOf(":", first + 1);
      const third = line.indexOf(":", second + 1);
      const path = line.slice(first + 1, second);
      const lineNumber = line.slice(second + 1, third);
      findings.push(
        ...scanText(line.slice(third + 1), `${commit.slice(0, 12)}:${path}:${lineNumber}`),
      );
    }
  }
  return findings;
}

function filesBelow(root) {
  const result = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) result.push(...filesBelow(path));
    else result.push(path);
  }
  return result;
}

function scanBrowser(root) {
  return filesBelow(root).flatMap((path) => {
    if (!textExtensions.has(extname(path).toLowerCase())) return [];
    return scanText(readFileSync(path, "utf8"), path);
  });
}

function main() {
  const args = process.argv.slice(2);
  const findings = [];
  if (args.includes("--source")) findings.push(...scanSource());
  if (args.includes("--history")) findings.push(...scanHistory());
  const browserIndex = args.indexOf("--browser");
  if (browserIndex >= 0) findings.push(...scanBrowser(args[browserIndex + 1]));
  const unique = [
    ...new Map(
      findings.map((item) => [`${item.kind}:${item.location}:${item.fingerprint}`, item]),
    ).values(),
  ];
  if (unique.length) {
    for (const finding of unique)
      console.error(`${finding.kind} ${finding.location} fingerprint=${finding.fingerprint}`);
    process.exitCode = 1;
    return;
  }
  console.log("Release secret scan PASS: no privileged secret candidates found.");
}

if (process.argv[1]?.endsWith("secret-scan.mjs")) main();
