"use client";

/**
 * MeetStage — écran in-call PREMIUM de CCB Meet.
 *
 * Rendu à l'intérieur du <LiveKitRoom> (monté par PersistentCallHost) sur les
 * pages /meeting et /call. Réutilise les composants LiveKit éprouvés
 * (TrackToggle, DisconnectButton, ParticipantTile, useTracks) — aucune
 * modification de la mécanique d'appel : c'est une couche purement visuelle.
 *
 * - Grille ADAPTATIVE selon le nombre de participants (2=50/50, 3-4, mosaïque)
 * - Mode PRÉSENTATION quand un partage d'écran est actif (grand + miniatures)
 * - 1-1 vidéo (DM) : interlocuteur plein écran + caméra locale en PiP déplaçable
 * - Barre de contrôle flottante premium + minuteur + compteur participants
 * - Thème sombre #121212 / cartes #1E1E1E / violet #5A2CA0 / or #D4AF37
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ParticipantTile,
  TrackToggle,
  DisconnectButton,
  useTracks,
  useParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { useCall } from "@/lib/meet/CallContext";

const VIOLET = "#5A2CA0";
const GOLD = "#D4AF37";

function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function gridCols(n: number, isMobile: boolean): number {
  if (isMobile) {
    if (n <= 1) return 1;
    if (n <= 4) return 2;
    return 3;
  }
  if (n <= 1) return 1;
  if (n <= 2) return 2;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  if (n <= 16) return 4;
  return 5;
}

export default function MeetStage({ isAudio }: { isAudio: boolean }) {
  const { endCall, state } = useCall();
  const router = useRouter();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const screenShare = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera);

  const [elapsed, setElapsed] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function handleLeave() {
    endCall();
    router.push(state.backUrl ?? "/community/groups");
  }
  function handleMinimize() {
    router.back();
  }

  const count = participants.length;
  const callName = state.groupName || "CCB Meet";
  const isDmOneToOne =
    !!state.conversationId && !state.groupId && !isAudio && !screenShare && cameraTracks.length === 2;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#121212",
      display: "flex", flexDirection: "column", zIndex: 200, color: "#fff",
    }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "max(10px, env(safe-area-inset-top, 10px)) 14px 10px",
        background: "linear-gradient(180deg, rgba(0,0,0,0.55), transparent)",
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 3,
      }}>
        <button onClick={handleMinimize} aria-label="Réduire" style={iconBtn}>‹</button>
        <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {isAudio ? "📞" : "🎥"} {callName}
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.75, display: "flex", gap: 8, justifyContent: "center", alignItems: "center", marginTop: 1 }}>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtDuration(elapsed)}</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.5)" }} />
            <span>👥 {count}</span>
          </div>
        </div>
        <div style={{ width: 38 }} />
      </div>

      {/* ── Zone principale ── */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {screenShare ? (
          <Presentation screen={screenShare} cams={cameraTracks} isMobile={isMobile} />
        ) : isDmOneToOne ? (
          <PipLayout cams={cameraTracks} localIdentity={localParticipant.identity} />
        ) : (
          <AdaptiveGrid tracks={cameraTracks} count={Math.max(count, cameraTracks.length)} isMobile={isMobile} />
        )}
      </div>

      {/* ── Barre de contrôle flottante ── */}
      <ControlBar isAudio={isAudio} onLeave={handleLeave} />
    </div>
  );
}

/* ─────────────── Grille adaptative ─────────────── */
function AdaptiveGrid({ tracks, count, isMobile }: { tracks: TrackReferenceOrPlaceholder[]; count: number; isMobile: boolean }) {
  const cols = gridCols(count, isMobile);
  return (
    <div className="ccb-meet-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, height: "100%", alignContent: "center" }}>
      {tracks.map((t, i) => (
        <ParticipantTile key={(t.participant?.identity ?? "p") + i} trackRef={t} />
      ))}
    </div>
  );
}

/* ─────────────── Mode présentation (partage d'écran) ─────────────── */
function Presentation({ screen, cams, isMobile }: { screen: TrackReferenceOrPlaceholder; cams: TrackReferenceOrPlaceholder[]; isMobile: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100%", gap: 6, padding: 6 }}>
      <div style={{ flex: 1, minHeight: 0, minWidth: 0, borderRadius: 14, overflow: "hidden", background: "#000", position: "relative" }}>
        <ParticipantTile trackRef={screen} />
        <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", color: GOLD, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>
          🖥️ Présentation
        </div>
      </div>
      <div style={{
        display: "flex", flexDirection: isMobile ? "row" : "column",
        gap: 6, overflowX: isMobile ? "auto" : "visible", overflowY: isMobile ? "visible" : "auto",
        flexShrink: 0, width: isMobile ? "100%" : 168, maxHeight: isMobile ? 100 : "100%",
      }}>
        {cams.map((t, i) => (
          <div key={(t.participant?.identity ?? "c") + i} style={{ flexShrink: 0, width: isMobile ? 130 : "100%", aspectRatio: "1 / 1", borderRadius: 12, overflow: "hidden", background: "#1E1E1E" }}>
            <ParticipantTile trackRef={t} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── 1-1 vidéo : interlocuteur plein écran + PiP déplaçable ─────────────── */
function PipLayout({ cams, localIdentity }: { cams: TrackReferenceOrPlaceholder[]; localIdentity: string }) {
  const remote = cams.find((t) => t.participant?.identity !== localIdentity) ?? cams[0];
  const local = cams.find((t) => t.participant?.identity === localIdentity) ?? cams[1];

  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 16, y: 90 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  function onDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const w = window.innerWidth, h = window.innerHeight;
    const nx = Math.min(Math.max(8, e.clientX - drag.current.dx), w - 124);
    const ny = Math.min(Math.max(70, e.clientY - drag.current.dy), h - 200);
    setPos({ x: nx, y: ny });
  }
  function onUp() { drag.current = null; }

  return (
    <div style={{ height: "100%", width: "100%", position: "relative", background: "#000" }}>
      {remote && <ParticipantTile trackRef={remote} />}
      {local && (
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          style={{
            position: "absolute", left: pos.x, top: pos.y,
            width: 112, aspectRatio: "3 / 4", borderRadius: 14, overflow: "hidden",
            border: `2px solid ${GOLD}`, boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            cursor: "grab", touchAction: "none", zIndex: 4, background: "#1E1E1E",
          }}
        >
          <ParticipantTile trackRef={local} />
        </div>
      )}
    </div>
  );
}

/* ─────────────── Barre de contrôle ─────────────── */
function ControlBar({ isAudio, onLeave }: { isAudio: boolean; onLeave: () => void }) {
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 5,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
      padding: "14px 16px",
      paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
      background: "linear-gradient(0deg, rgba(0,0,0,0.7), transparent)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(30,30,30,0.92)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 999, padding: "10px 14px", backdropFilter: "blur(14px)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
      }}>
        <TrackToggle source={Track.Source.Microphone} showIcon style={ctrlBtn(false)}>
          <span style={{ fontSize: 20 }}>🎙️</span>
        </TrackToggle>

        {!isAudio && (
          <TrackToggle source={Track.Source.Camera} showIcon style={ctrlBtn(false)}>
            <span style={{ fontSize: 20 }}>📹</span>
          </TrackToggle>
        )}

        {!isAudio && (
          <TrackToggle source={Track.Source.ScreenShare} showIcon style={ctrlBtn(false)}>
            <span style={{ fontSize: 20 }}>🖥️</span>
          </TrackToggle>
        )}

        <DisconnectButton onClick={onLeave} style={{ ...ctrlBtn(true), width: 64 }}>
          <span style={{ fontSize: 20 }}>📞</span>
        </DisconnectButton>
      </div>
    </div>
  );
}

/* ─────────────── styles ─────────────── */
const iconBtn: React.CSSProperties = {
  width: 38, height: 38, borderRadius: 999, flexShrink: 0,
  background: "rgba(255,255,255,0.12)", color: "#fff", border: "none",
  cursor: "pointer", fontSize: 20, display: "inline-flex", alignItems: "center", justifyContent: "center",
};
function ctrlBtn(danger: boolean): React.CSSProperties {
  return {
    width: 54, height: 54, borderRadius: 999, border: "none", cursor: "pointer",
    color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: danger ? "#DC2626" : "rgba(255,255,255,0.10)",
    boxShadow: danger ? "0 4px 14px rgba(220,38,38,0.5)" : "none",
  };
}
