/** A rotating Quick Quest theme, not a separate DAILY persistence or rewards model. */
export function dailyChallengeSeed(now = new Date()): string {
  return `boredom-buster-v1:${now.toISOString().slice(0, 10)}`;
}
