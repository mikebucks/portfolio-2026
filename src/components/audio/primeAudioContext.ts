/**
 * iOS Safari audio unlock, kept apart from Tone so it can run synchronously.
 *
 * Two iOS-specific rules make the "just call Tone.start() when needed" approach
 * silently fail there while working everywhere else:
 *
 * 1. `AudioContext.resume()` only sticks when called during a user gesture.
 *    Our unlock path awaits `import("tone")` first, and by the time the module
 *    resolves the gesture's activation has expired — desktop browsers forgive
 *    this (they re-resume on the next gesture), iOS doesn't. So the raw
 *    context is created and resumed *here*, synchronously inside the gesture,
 *    and handed to Tone afterwards via `Tone.setContext`.
 *
 * 2. A page using only Web Audio runs in the "ambient" audio session, which
 *    the hardware ring/silent switch mutes — the address-bar speaker icon
 *    shows, but nothing comes out. Requesting the "playback" session exempts
 *    us from the switch: directly through `navigator.audioSession` where it
 *    exists, otherwise by looping a silent <audio> element, which iOS treats
 *    as media playback and promotes the session for.
 *
 * `primeAudioContext()` is idempotent and cheap, so callers invoke it on every
 * gesture that should produce sound — that also recovers the context from the
 * suspended/"interrupted" state iOS leaves it in after a phone call, Siri, or
 * backgrounding.
 */

let ctx: AudioContext | null = null;
let silentEl: HTMLAudioElement | null = null;

const isIOS = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  // iPadOS 13+ reports as macOS but is the only "Mac" with touch points.
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// ~0.1s of 16-bit mono silence at 8kHz as a data URI — built in code rather
// than pasted as opaque base64 so it's auditable.
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
  // Sample data stays zeroed — that's the silence.

  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return "data:audio/wav;base64," + btoa(bin);
}

/**
 * Create (once) and resume the shared AudioContext, and claim the "playback"
 * audio session. Must be called synchronously from inside a real user gesture
 * — no awaits between the event handler and this call.
 */
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
      // Engine exposes the object but rejects the assignment — treat it as
      // absent and let the element fallback carry the switch exemption.
    }
  }
  if (!sessionClaimed && isIOS()) {
    if (!silentEl) {
      silentEl = document.createElement("audio");
      silentEl.src = silentWavUri();
      silentEl.loop = true;
    }
    // iOS pauses media elements on backgrounding, dropping the session back
    // to ambient — replay on each priming gesture, not just the first.
    if (silentEl.paused) void silentEl.play().catch(() => {});
  }

  if (ctx.state !== "running") void ctx.resume();

  return ctx;
}
