param(
  [switch]$SkipReset
)

$ErrorActionPreference = "Stop"

Write-Host "Checking Docker and starting the isolated local Supabase stack..."
docker info | Out-Null
$null = npx supabase start

if (-not $SkipReset) {
  Write-Host "Resetting local-only data for a deterministic Player journey..."
  npx supabase db reset --local
}

$status = npx supabase status -o json | ConvertFrom-Json
$publishableKey = if ($status.PUBLISHABLE_KEY) { $status.PUBLISHABLE_KEY } else { $status.ANON_KEY }
$secretKey = if ($status.SECRET_KEY) { $status.SECRET_KEY } else { $status.SERVICE_ROLE_KEY }

if (-not $status.API_URL -or -not $publishableKey -or -not $secretKey) {
  throw "The local Supabase status did not include the required local-only values."
}

$env:NEXT_PUBLIC_SUPABASE_URL = $status.API_URL
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $publishableKey
$env:SUPABASE_SECRET_KEY = $secretKey

Write-Host "Local Player data is isolated at $($status.API_URL)."
Write-Host "Open http://127.0.0.1:3000/onboarding and follow docs/accessibility/UX-005-release-accessibility-audit.md."
Write-Host "Press Ctrl+C when the manual Narrator smoke is finished."
npm run dev -- --hostname 127.0.0.1
