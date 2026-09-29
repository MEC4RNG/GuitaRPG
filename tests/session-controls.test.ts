import { describe, expect, it } from "vitest";
import {
  BPM_MAX,
  BPM_MIN,
  deriveLatestBpm,
  deriveRepCount,
  validateControlEvents,
} from "@/lib/session/controls/runtime";
import { canRunMetronome } from "@/lib/session/controls/metronome";

describe("SES-002 control derivation", () => {
  const events = [
    { sequence: 1, event_type: "REP_ADJUST" as const, payload: { delta: 1 as const } },
    { sequence: 2, event_type: "METRONOME_BPM_SET" as const, payload: { bpm: 96 } },
    { sequence: 3, event_type: "REP_ADJUST" as const, payload: { delta: -1 as const } },
  ];

  it("derives append-only rep corrections and latest BPM", () => {
    expect(deriveRepCount(events)).toBe(0);
    expect(deriveLatestBpm(events)).toBe(96);
    expect(deriveLatestBpm([], 112)).toBe(112);
  });

  it("does not retain metronome playback across a pause, end, or reload", () => {
    expect(canRunMetronome("ACTIVE", true)).toBe(true);
    expect(canRunMetronome("PAUSED", true)).toBe(false);
    expect(canRunMetronome("ENDED", true)).toBe(false);
    expect(canRunMetronome("ACTIVE", false)).toBe(false);
  });
  it("rejects malformed ordering, negative totals, and BPM bounds", () => {
    expect(() => validateControlEvents([{ ...events[0]!, sequence: 2 }])).toThrow();
    expect(() =>
      deriveRepCount([{ sequence: 1, event_type: "REP_ADJUST", payload: { delta: -1 } }]),
    ).toThrow();
    expect(() =>
      validateControlEvents([
        { sequence: 1, event_type: "METRONOME_BPM_SET", payload: { bpm: BPM_MAX + 1 } },
      ]),
    ).toThrow();
    expect(BPM_MIN).toBe(30);
  });
});
