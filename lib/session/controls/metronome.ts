import { BPM_MAX, BPM_MIN } from "./runtime";
import type { SessionStatus } from "../runtime";

const LOOK_AHEAD_MILLISECONDS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.1;

export function canRunMetronome(status: SessionStatus, isEnabled: boolean) {
  return status === "ACTIVE" && isEnabled;
}

export class BrowserMetronome {
  private context: AudioContext | null = null;
  private scheduler: ReturnType<typeof setInterval> | null = null;
  private nextTickAt = 0;

  start(bpm: number) {
    if (!Number.isInteger(bpm) || bpm < BPM_MIN || bpm > BPM_MAX)
      throw new Error(`BPM must be a whole number between ${BPM_MIN} and ${BPM_MAX}`);
    if (typeof window === "undefined") return;

    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) throw new Error("Web Audio is not available in this browser");

    this.stop();
    this.context = new AudioContextConstructor();
    void this.context.resume();
    this.nextTickAt = this.context.currentTime;
    this.scheduler = setInterval(() => this.schedule(bpm), LOOK_AHEAD_MILLISECONDS);
  }

  stop() {
    if (this.scheduler) clearInterval(this.scheduler);
    this.scheduler = null;
    if (this.context) void this.context.close();
    this.context = null;
  }

  private schedule(bpm: number) {
    if (!this.context) return;
    const secondsPerBeat = 60 / bpm;
    while (this.nextTickAt < this.context.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, this.nextTickAt);
      gain.gain.exponentialRampToValueAtTime(0.16, this.nextTickAt + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.nextTickAt + 0.045);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(this.nextTickAt);
      oscillator.stop(this.nextTickAt + 0.05);
      this.nextTickAt += secondsPerBeat;
    }
  }
}
