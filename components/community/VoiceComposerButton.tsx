"use client";

/**
 * VoiceComposerButton — bouton rond façon WhatsApp en bout de composer.
 *  - champ vide      → 🎤 micro (démarre un message vocal)
 *  - champ non vide  → ➤ envoyer
 *  - en enregistrement → 🗑 annuler · timer · ➤ envoyer
 *
 * L'enregistrement utilise MediaRecorder (audio/webm ou audio/mp4 selon le
 * support). À l'arrêt, le blob est emballé dans un File et remonté via onVoice
 * (le parent l'upload + l'envoie comme pièce jointe audio — déjà rendue par les
 * deux chats). Dégradation propre si le micro est indisponible/refusé.
 */

import { useEffect, useRef, useState } from "react";

interface Props {
  hasContent: boolean;
  disabled?: boolean;
  color: string;       // violet de marque
  colorDark: string;
  onSend: () => void;
  onVoice: (file: File) => void;
  onError?: (msg: string) => void;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function VoiceComposerButton({ hasContent, disabled, color, colorDark, onSend, onVoice, onError }: Props) {
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  function cleanup() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mrRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setSecs(0);
  }

  // Nettoyage si le composant est démonté pendant un enregistrement
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  async function startRec() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError?.("Message vocal non supporté sur cet appareil.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const cancelled = cancelledRef.current;
        const type = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        cleanup();
        if (cancelled || blob.size < 800) return; // trop court → ignore
        const ext = type.includes("mp4") || type.includes("m4a") ? "m4a" : "webm";
        onVoice(new File([blob], `vocal-${Date.now()}.${ext}`, { type }));
      };
      mrRef.current = mr;
      mr.start();
      setRecording(true);
      setSecs(0);
      timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      onError?.("Micro indisponible (autorisation refusée ?).");
      cleanup();
    }
  }

  function stopAndSend() { cancelledRef.current = false; try { mrRef.current?.stop(); } catch { cleanup(); } }
  function cancelRec()  { cancelledRef.current = true;  try { mrRef.current?.stop(); } catch { cleanup(); } }

  const round = (bg: string): React.CSSProperties => ({
    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
    background: bg, color: "#fff", border: "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, cursor: "pointer", boxShadow: `0 3px 10px ${color}44`,
  });

  if (recording) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button onClick={cancelRec} title="Annuler" style={{ ...round("#6B7280"), boxShadow: "none" }}>🗑</button>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#DC2626", animation: "ccb-rec-blink 1s steps(2,start) infinite" }} />
          {fmt(secs)}
        </span>
        <button onClick={stopAndSend} title="Envoyer le vocal" style={round(`linear-gradient(135deg, ${color}, ${colorDark})`)}>➤</button>
        <style>{`@keyframes ccb-rec-blink{50%{opacity:0;}}`}</style>
      </div>
    );
  }

  if (hasContent) {
    return (
      <button onClick={onSend} disabled={disabled}
        title="Envoyer"
        style={{ ...round(`linear-gradient(135deg, ${color}, ${colorDark})`), opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
        ➤
      </button>
    );
  }

  return (
    <button onClick={startRec} disabled={disabled}
      title="Message vocal"
      style={round(`linear-gradient(135deg, ${color}, ${colorDark})`)}>
      🎤
    </button>
  );
}
