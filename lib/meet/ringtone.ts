"use client";

/**
 * Sonnerie d'appel CCB Meet — générée via Web Audio (aucun fichier binaire).
 * Boucle continue façon « ring… ring… » + vibration sur mobile.
 *
 * NB : les navigateurs bloquent l'audio tant qu'aucune interaction utilisateur
 * n'a eu lieu. `primeRingtone()` débloque l'AudioContext au 1er geste (à
 * appeler une fois au montage de l'app). Si malgré tout l'audio est bloqué,
 * l'écran d'appel reste visible et la vibration prend le relais.
 */

let ctx: AudioContext | null = null;
let loopTimer: ReturnType<typeof setInterval> | null = null;
let vibrateTimer: ReturnType<typeof setInterval> | null = null;
let primed = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  return ctx;
}

/** Débloque l'audio au premier geste utilisateur (appeler 1× au boot). */
export function primeRingtone(): void {
  if (primed || typeof window === "undefined") return;
  const unlock = () => {
    const c = getCtx();
    if (c && c.state === "suspended") c.resume().catch(() => {});
    primed = true;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
}

/** Un « ring » = deux brèves tonalités (cadence téléphonique). */
function playRing(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const now = c.currentTime;
  [0, 0.4].forEach((offset) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = 470;
    const start = now + offset;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
    gain.gain.setValueAtTime(0.16, start + 0.28);
    gain.gain.linearRampToValueAtTime(0, start + 0.33);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.35);
  });
}

function vibrateOnce(): void {
  try { navigator.vibrate?.([350, 200, 350]); } catch { /* noop */ }
}

/** Démarre la sonnerie en boucle (idempotent). */
export function startRingtone(): void {
  stopRingtone();
  playRing();
  vibrateOnce();
  loopTimer = setInterval(playRing, 2400);
  vibrateTimer = setInterval(vibrateOnce, 2400);
}

/** Arrête la sonnerie + la vibration. */
export function stopRingtone(): void {
  if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
  if (vibrateTimer) { clearInterval(vibrateTimer); vibrateTimer = null; }
  try { navigator.vibrate?.(0); } catch { /* noop */ }
}
