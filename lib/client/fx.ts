"use client";
import { get } from "@/lib/store";

// Voice: browser SpeechSynthesis. Optional, never blocks, silently no-ops if unsupported.
export function speak(text: string) {
  if (!get().voiceOn || typeof speechSynthesis === "undefined") return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/https?:\/\/\S+/g, "a link"));
    const voices = speechSynthesis.getVoices();
    u.voice = voices.find((v) => v.lang === "en-IN") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
    u.rate = 1.05;
    speechSynthesis.speak(u);
  } catch {}
}

export function hush() {
  try {
    speechSynthesis.cancel();
  } catch {}
}

// Tiny UI sounds via WebAudio (no assets). Muted by default.
let ctx: AudioContext | null = null;
const TONES = { tick: [880, 0.04], send: [660, 0.06], threat: [196, 0.35], safe: [523, 0.3] } as const;

export function blip(kind: keyof typeof TONES) {
  if (!get().soundOn) return;
  try {
    ctx ??= new AudioContext();
    const [freq, dur] = TONES[kind];
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.type = kind === "threat" ? "sawtooth" : "sine";
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch {}
}
