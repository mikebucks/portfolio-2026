/**
 * iOS Safari unlock, kept apart from Tone so it runs synchronously in the gesture.
 * resume() only sticks inside a gesture; awaiting import("tone") first expires it.
 * The "playback" session exempts us from the ring/silent switch; the silent
 * <audio> loop is the fallback where navigator.audioSession is missing.
 */

let ctx: AudioContext | null = null;
let silentEl: HTMLAudioElement | null = null;

const isIOS = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  // iPadOS 13+ reports as macOS.
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// ~0.1s of silence as a WAV data URI.
function silentWavUri(): string {
  const rate = 8000;
  const samples = 800;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
  };
  ascii(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  ascii(36, "data");
  v.setUint32(40, samples * 2, true);

  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return "data:audio/wav;base64," + btoa(bin);
}

/** Idempotent. Call synchronously inside a user gesture — no awaits before it. */
export function primeAudioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext({ latencyHint: "interactive" });

  const session = (navigator as { audioSession?: { type: string } })
    .audioSession;
  let sessionClaimed = false;
  if (session) {
    try {
      session.type = "playback";
      sessionClaimed = session.type === "playback";
    } catch {
      // Assignment rejected; fall through to the element fallback.
    }
  }
  if (!sessionClaimed && isIOS()) {
    if (!silentEl) {
      silentEl = document.createElement("audio");
      silentEl.src = silentWavUri();
      silentEl.loop = true;
    }
    // iOS pauses it on backgrounding; replay each gesture.
    if (silentEl.paused) void silentEl.play().catch(() => {});
  }

  if (ctx.state !== "running") void ctx.resume();

  return ctx;
}
