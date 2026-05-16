// Audio Bible via Web Speech API (gratuit, navigateur natif)
// Sélectionne automatiquement une voix française si disponible.

export interface SpeakOptions {
  rate?: number;   // 0.5 → 2 (défaut 1)
  pitch?: number;  // 0 → 2 (défaut 1)
  voice?: SpeechSynthesisVoice | null;
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function getFrenchVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("fr"));
}

export function getDefaultFrenchVoice(): SpeechSynthesisVoice | null {
  const voices = getFrenchVoices();
  if (voices.length === 0) return null;
  // Préfère une voix Google ou Microsoft (meilleure qualité)
  const preferred = voices.find(
    (v) => /google|microsoft|amelie|aurelie|thomas/i.test(v.name),
  );
  return preferred ?? voices[0];
}

export function speak(text: string, opts: SpeakOptions = {}): SpeechSynthesisUtterance | null {
  if (!isSpeechSupported()) return null;
  const synth = window.speechSynthesis;
  synth.cancel(); // arrête toute lecture en cours
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = opts.rate ?? 1;
  u.pitch = opts.pitch ?? 1;
  const v = opts.voice ?? getDefaultFrenchVoice();
  if (v) u.voice = v;
  synth.speak(u);
  return u;
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}

export function pauseSpeaking(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.pause();
}

export function resumeSpeaking(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.resume();
}
