import { spawnSync } from "node:child_process";

const allowedDevelopmentAdvisories = new Map([
  [
    "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
    "braces receives only framework-controlled glob patterns through the development-only Next ESLint plugin; repository filenames are data, not patterns",
  ],
]);
const allowedDevelopmentPackages = new Set([
  "braces",
  "micromatch",
  "fast-glob",
  "@next/eslint-plugin-next",
  "eslint-config-next",
]);

function audit(args) {
  const result = spawnSync("npm", ["audit", "--json", ...args], {
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (!result.stdout.trim()) throw new Error("npm audit returned no JSON report");
  return JSON.parse(result.stdout);
}

function blockingFindings(report, production) {
  const findings = [];
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
    if (!["high", "critical"].includes(vulnerability.severity)) continue;
    const advisories = (vulnerability.via ?? []).filter((item) => typeof item === "object");
    const allowed =
      !production &&
      allowedDevelopmentPackages.has(name) &&
      (vulnerability.via ?? []).every(
        (item) =>
          (typeof item === "string" && allowedDevelopmentPackages.has(item)) ||
          (typeof item === "object" && allowedDevelopmentAdvisories.has(item.url)),
      );
    if (!allowed) findings.push({ name, severity: vulnerability.severity, advisories });
  }
  return findings;
}

const complete = audit([]);
const production = audit(["--omit=dev"]);
const completeBlocking = blockingFindings(complete, false);
const productionBlocking = blockingFindings(production, true);

for (const [url, rationale] of allowedDevelopmentAdvisories)
  console.log(`Documented development-only advisory: ${url} — ${rationale}.`);

if (completeBlocking.length || productionBlocking.length) {
  for (const finding of [...completeBlocking, ...productionBlocking])
    console.error(
      `Blocking dependency finding: ${finding.name} severity=${finding.severity} advisories=${finding.advisories.map((item) => item.url).join(",") || "transitive"}`,
    );
  process.exitCode = 1;
} else {
  console.log(
    `Dependency audit policy PASS: production high/critical=0; complete graph documented exceptions=${allowedDevelopmentAdvisories.size}.`,
  );
}
