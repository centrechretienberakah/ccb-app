"use client";

/**
 * Partage de MUSIQUE dans un appel CCB Meet — sans partage d'écran.
 *
 * Principe : on lit un fichier audio local via WebAudio, on route le son vers
 * un MediaStreamDestination, et on PUBLIE cette piste dans la salle LiveKit en
 * tant que `ScreenShareAudio` (source rendue par <RoomAudioRenderer> côté
 * participants). Résultat : tout le monde entend la musique, l'animateur peut
 * continuer à parler par-dessus (le micro reste une piste indépendante), et il
 * n'y a NI partage d'écran NI larsen numérique (les participants reçoivent une
 * copie propre du son, pas via un micro).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Track } from "livekit-client";
import type { Room, LocalTrackPublication } from "livekit-client";

const VIOLET = "#5B21B6";
const GOLD = "#D4AF37";
const CARD = "#1E1E1E";

export interface MusicShare {
  active: boolean;          // une piste musique est publiée
  playing: boolean;
  fileName: string | null;
  loop: boolean;
  volume: number;           // 0..1
  start: (file: File) => Promise<void>;
  togglePlay: () => void;
  stop: () => Promise<void>;
  setLoop: (v: boolean) => void;
  setVolume: (v: number) => void;
}

export function useMusicShare(room: Room | null, flash?: (m: string) => void): MusicShare {
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loop, setLoopState] = useState(true);
  const [volume, setVolumeState] = useState(0.85);

  const ctxRef = useRef<AudioContext | null>(null);
  const elRef = useRef<HTMLAudioElement | null>(null);
  const srcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const pubRef = useRef<LocalTrackPublication | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = useCallback(async () => {
    try {
      const tr = pubRef.current?.track;
      if (room && tr) await room.localParticipant.unpublishTrack(tr);
    } catch { /* noop */ }
    pubRef.current = null;
    try { elRef.current?.pause(); } catch { /* noop */ }
    try { srcRef.current?.disconnect(); } catch { /* noop */ }
    try { gainRef.current?.disconnect(); } catch { /* noop */ }
    try { destRef.current?.disconnect(); } catch { /* noop */ }
    if (urlRef.current) { try { URL.revokeObjectURL(urlRef.current); } catch { /* noop */ } urlRef.current = null; }
    elRef.current = null; srcRef.current = null; gainRef.current = null; destRef.current = null;
    setActive(false); setPlaying(false); setFileName(null);
  }, [room]);

  const start = useCallback(async (file: File) => {
    if (!room) return;
    await cleanup(); // remplace un partage précédent
    try {
      const AC = window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = ctxRef.current ?? new AC();
      ctxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const url = URL.createObjectURL(file);
      urlRef.current = url;
      const el = new Audio();
      el.src = url;
      el.loop = loop;
      elRef.current = el;

      const src = ctx.createMediaElementSource(el);
      const gain = ctx.createGain();
      gain.gain.value = volume;
      const dest = ctx.createMediaStreamDestination();
      src.connect(gain);
      gain.connect(dest);             // → participants (LiveKit)
      gain.connect(ctx.destination);  // → écoute locale de l'animateur
      srcRef.current = src; gainRef.current = gain; destRef.current = dest;

      const track = dest.stream.getAudioTracks()[0];
      if (!track) throw new Error("no audio track");
      pubRef.current = await room.localParticipant.publishTrack(track, {
        name: "🎵 Musique",
        source: Track.Source.ScreenShareAudio,
      });

      el.onended = () => { if (!el.loop) setPlaying(false); };
      await el.play();
      setFileName(file.name); setActive(true); setPlaying(true);
      flash?.("🎵 Musique partagée avec les participants");
    } catch {
      flash?.("Impossible de partager la musique sur cet appareil.");
      await cleanup();
    }
  }, [room, cleanup, loop, volume, flash]);

  const togglePlay = useCallback(() => {
    const el = elRef.current; if (!el) return;
    if (el.paused) { void el.play(); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  }, []);

  const stop = useCallback(async () => { await cleanup(); flash?.("Musique arrêtée."); }, [cleanup, flash]);

  const setLoop = useCallback((v: boolean) => { setLoopState(v); if (elRef.current) elRef.current.loop = v; }, []);
  const setVolume = useCallback((v: number) => { setVolumeState(v); if (gainRef.current) gainRef.current.gain.value = v; }, []);

  // Nettoyage à la fin de l'appel / démontage.
  useEffect(() => () => { void cleanup(); try { ctxRef.current?.close(); } catch { /* noop */ } }, [cleanup]);

  return { active, playing, fileName, loop, volume, start, togglePlay, stop, setLoop, setVolume };
}

const bigBtn: React.CSSProperties = {
  width: "100%", background: VIOLET, color: "#fff", border: "none", borderRadius: 12,
  padding: "13px", fontWeight: 800, fontSize: 14, cursor: "pointer",
};

export function MusicPanel({ music, onClose }: { music: MusicShare; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 2100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        width: "100%", maxWidth: 520, background: CARD, borderRadius: "20px 20px 0 0",
        padding: "16px 16px calc(18px + env(safe-area-inset-bottom, 0px))", color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>🎵 Partager une musique</span>
          <button onClick={onClose} aria-label="Fermer" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <input ref={fileRef} type="file" accept="audio/*" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void music.start(f); if (fileRef.current) fileRef.current.value = ""; }} />

        {!music.active ? (
          <>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", margin: "0 0 14px", lineHeight: 1.5 }}>
              Choisis un fichier audio de ton appareil. Tous les participants l&apos;entendront, et tu peux continuer à parler par-dessus — sans partage d&apos;écran.
            </p>
            <button onClick={() => fileRef.current?.click()} style={bigBtn}>📂 Choisir un fichier audio</button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 12px", marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>🎵</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{music.fileName}</div>
                <div style={{ fontSize: 11, color: GOLD }}>{music.playing ? "En lecture · les participants l'entendent" : "En pause"}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <button onClick={music.togglePlay} style={{ ...bigBtn, flex: 1 }}>{music.playing ? "⏸️ Pause" : "▶️ Reprendre"}</button>
              <button onClick={() => void music.stop()} style={{ ...bigBtn, flex: 1, background: "#DC2626" }}>⏹️ Arrêter</button>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, marginBottom: 12 }}>
              <span style={{ width: 64, flexShrink: 0 }}>🔊 Volume</span>
              <input type="range" min={0} max={1} step={0.05} value={music.volume}
                onChange={(e) => music.setVolume(parseFloat(e.target.value))} style={{ flex: 1 }} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={music.loop} onChange={(e) => music.setLoop(e.target.checked)} /> Lecture en boucle
            </label>
            <button onClick={() => fileRef.current?.click()} style={{ ...bigBtn, background: "rgba(255,255,255,0.08)", marginTop: 12 }}>🔁 Changer de fichier</button>
          </>
        )}

        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "14px 0 0", lineHeight: 1.5 }}>
          🎧 Astuce : branche un casque pour éviter l&apos;écho (sinon ton micro peut renvoyer la musique aux participants).
        </p>
      </div>
    </div>
  );
}
