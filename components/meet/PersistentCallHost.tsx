"use client";

/**
 * PersistentCallHost — composant always-mounted dans l'AppShell.
 *
 * Quand un appel est actif (state.active = true), il mounte le <LiveKitRoom>
 * UNE SEULE FOIS pour toute la durée de l'appel. Le LiveKitRoom contient :
 *   - Sur /community/groups/<id>/meeting → vue full screen (FullStage)
 *   - Sur toute autre URL → mini-player flottant (MiniPlayer)
 *
 * Conséquence : naviguer entre pages NE déconnecte PAS l'utilisateur de
 * l'appel. Le WebRTC reste actif.
 */

import { useRouter, usePathname } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ParticipantTile,
  TrackLoop,
  TrackToggle,
  DisconnectButton,
  useTracks,
  useRoomContext,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track, ConnectionState } from "livekit-client";
import { useCall } from "@/lib/meet/CallContext";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef } from "react";

export default function PersistentCallHost() {
  const { state, endCall } = useCall();
  const pathname = usePathname();

  if (!state.active || !state.token || !state.serverUrl) return null;

  const isOnMeetingPage =
    !!pathname?.match(/^\/community\/groups\/[^/]+\/meeting$/) ||
    !!pathname?.match(/^\/community\/messages\/[^/]+\/call$/);
  const isAudio = state.mode === "audio";

  return (
    <LiveKitRoom
      token={state.token}
      serverUrl={state.serverUrl}
      connect
      video={!isAudio && state.videoEnabled}
      audio={state.audioEnabled}
      connectOptions={{ autoSubscribe: true }}
      options={{
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          videoCodec: "vp9",
          audioPreset: { maxBitrate: 32_000 },
        },
      }}
      onDisconnected={() => {
        // Quand LiveKit se déconnecte (raccrocher, ou serveur ferme la
        // room), on clear le contexte → UI disparaît proprement.
        endCall();
      }}
      data-lk-theme="ccb"
    >
      <RoomAudioRenderer />
      {/* Tracking DB des sessions — uniquement pour les appels de groupe.
          Les appels privés (DM) ne passent pas par meet_sessions. */}
      {state.groupId && (
        <SessionTracker groupId={state.groupId} mode={isAudio ? "audio" : "video"} />
      )}
      {isOnMeetingPage ? <FullStage isAudio={isAudio} /> : <MiniPlayer />}
      <CallBrandingStyles isAudio={isAudio} />
    </LiveKitRoom>
  );
}

// ─── Tracking session DB (join/leave + heartbeat) ─────────────────────
function SessionTracker({ groupId, mode }: { groupId: string; mode: "audio" | "video" }) {
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    async function rec() {
      try {
        const supabase = createClient();
        const { data } = await supabase.rpc("meet_session_join", {
          p_group_id: groupId, p_mode: mode,
        });
        if (!cancelled && typeof data === "string") {
          sessionIdRef.current = data;
          // Démarre le heartbeat : refresh last_seen_at toutes les 30s
          // → la vue meet_sessions_with_stats considère un participant
          //   inactif si last_seen_at > 90s (cf SQL v50). Avec un heartbeat
          //   à 30s on a 3 chances de rafraîchir avant timeout.
          // Si la RPC heartbeat n'existe pas (v50 pas migrée), silent ignore.
          heartbeatTimer = setInterval(() => {
            const sid = sessionIdRef.current;
            if (!sid) return;
            try {
              const sb = createClient();
              void sb.rpc("meet_session_heartbeat", { p_session_id: sid });
            } catch { /* noop */ }
          }, 30_000);
        }
      } catch { /* noop */ }
    }
    void rec();
    return () => {
      cancelled = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      const sid = sessionIdRef.current;
      if (!sid) return;
      try {
        const supabase = createClient();
        void supabase.rpc("meet_session_user_leave", { p_session_id: sid });
      } catch { /* noop */ }
    };
  }, [groupId, mode]);

  return null;
}

// ─── Vue full screen (sur /meeting) ───────────────────────────────────
function FullStage({ isAudio }: { isAudio: boolean }) {
  const { endCall, state } = useCall();
  const router = useRouter();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  function handleLeave() {
    endCall(); // triggers onDisconnected via LiveKit
    // Retour : conversation (DM) ou liste des groupes
    router.push(state.backUrl ?? "/community/groups");
  }

  // Click sur "x" pour minimiser (sans quitter)
  function handleMinimize() {
    router.back();
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#0F0A1F",
      display: "flex", flexDirection: "column",
      zIndex: 200,
    }}>
      {/* Header simple */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px",
        background: "rgba(0,0,0,0.4)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        color: "#fff",
        backdropFilter: "blur(8px)",
        flexShrink: 0,
      }}>
        <button onClick={handleMinimize} aria-label="Minimiser"
          style={{
            width: 36, height: 36, borderRadius: 999,
            background: "rgba(255,255,255,0.10)", color: "#fff",
            border: "none", cursor: "pointer", fontSize: 18,
          }}>‹</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 700, letterSpacing: 0.4 }}>
          {isAudio ? "📞 Appel vocal" : "🎥 Réunion vidéo"} · CCB
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Grille participants */}
      <div className="ccb-meet-grid" style={{
        flex: 1, minHeight: 0, overflow: "auto", padding: 4,
      }}>
        <TrackLoop tracks={tracks}>
          <ParticipantTile />
        </TrackLoop>
      </div>

      {/* Control bar custom — boutons explicites, visibles sur tous les
          écrans (safe-area iOS / Android prise en compte) */}
      <CustomControlBar isAudio={isAudio} onLeave={handleLeave} />
    </div>
  );
}

// ─── Control bar custom : mic / camera / leave avec safe-area mobile
function CustomControlBar({ isAudio, onLeave }: { isAudio: boolean; onLeave: () => void }) {
  const { isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  return (
    <div style={{
      flexShrink: 0,
      background: "rgba(15,10,31,0.96)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      padding: "12px 16px",
      paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      zIndex: 1,
    }}>
      {/* Micro toggle */}
      <TrackToggle
        source={Track.Source.Microphone}
        showIcon
        style={{
          width: 56, height: 56, borderRadius: 999,
          background: isMicrophoneEnabled ? "rgba(255,255,255,0.10)" : "#DC2626",
          color: "#fff", border: "none", cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {isMicrophoneEnabled ? "🎤" : "🔇"}
      </TrackToggle>

      {/* Camera toggle — seulement en vidéo */}
      {!isAudio && (
        <TrackToggle
          source={Track.Source.Camera}
          showIcon
          style={{
            width: 56, height: 56, borderRadius: 999,
            background: isCameraEnabled ? "rgba(255,255,255,0.10)" : "rgba(220,38,38,0.85)",
            color: "#fff", border: "none", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {isCameraEnabled ? "📹" : "📷"}
        </TrackToggle>
      )}

      {/* Partage d'écran — seulement en vidéo */}
      {!isAudio && (
        <TrackToggle
          source={Track.Source.ScreenShare}
          showIcon
          style={{
            width: 56, height: 56, borderRadius: 999,
            background: "rgba(255,255,255,0.10)",
            color: "#fff", border: "none", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          🖥️
        </TrackToggle>
      )}

      {/* Raccrocher — toujours visible, rouge */}
      <DisconnectButton
        onClick={onLeave}
        style={{
          width: 64, height: 56, borderRadius: 999,
          background: "#DC2626", color: "#fff", border: "none",
          cursor: "pointer", fontWeight: 700, fontSize: 18,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 14px rgba(220,38,38,0.5)",
        }}
      >
        📞
      </DisconnectButton>
    </div>
  );
}

// ─── Mini-player flottant (sur toutes les autres pages) ───────────────
function MiniPlayer() {
  const { state } = useCall();
  const room = useRoomContext();
  const router = useRouter();

  const isAudio = state.mode === "audio";
  const groupId = state.groupId;
  const connState = room?.state;
  const isConnected = connState === ConnectionState.Connected;

  function handleExpand() {
    if (state.conversationId) {
      router.push(`/community/messages/${state.conversationId}/call${isAudio ? "?mode=audio" : ""}`);
    } else if (groupId) {
      router.push(`/community/groups/${groupId}/meeting${isAudio ? "?mode=audio" : ""}`);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleExpand}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleExpand(); }}
      style={{
        position: "fixed",
        bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
        right: 12, left: 12,
        maxWidth: 480,
        margin: "0 auto",
        background: `linear-gradient(135deg, #5A2CA0, #3E1C70)`,
        color: "#fff",
        borderRadius: 16,
        padding: "10px 14px",
        boxShadow: "0 8px 24px rgba(90,44,160,0.45)",
        display: "flex", alignItems: "center", gap: 12,
        zIndex: 150,
        cursor: "pointer",
        animation: "ccb-pulse-mini 2.2s ease-in-out infinite",
      }}>
      <style>{`
        @keyframes ccb-pulse-mini {
          0%, 100% { box-shadow: 0 8px 24px rgba(90,44,160,0.45); }
          50%      { box-shadow: 0 8px 24px rgba(212,175,55,0.55); }
        }
        @media (min-width: 1024px) {
          [data-ccb-mini-call] { right: 24px !important; left: auto !important; bottom: 24px !important; }
        }
      `}</style>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: "rgba(255,255,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>
        {isAudio ? "📞" : "🎥"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>
          {isAudio ? "Appel vocal en cours" : "Réunion vidéo en cours"}
        </div>
        <div style={{ fontSize: 11, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {state.groupName ?? "Groupe CCB"} · {isConnected ? "Connecté" : "Connexion…"}
        </div>
      </div>
      <div style={{
        padding: "5px 10px",
        background: "rgba(255,255,255,0.18)",
        borderRadius: 999,
        fontSize: 11, fontWeight: 800,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}>
        Retour
      </div>
    </div>
  );
}

// ─── Branding CSS LiveKit ─────────────────────────────────────────────
function CallBrandingStyles({ isAudio }: { isAudio: boolean }) {
  return (
    <style>{`
      [data-lk-theme="ccb"] {
        --lk-bg: #0F0A1F;
        --lk-bg2: #1A1230;
        --lk-fg: #FFFFFF;
        --lk-accent-bg: #5A2CA0;
        --lk-accent-fg: #FFFFFF;
        --lk-accent2: #D4AF37;
        --lk-control-bg: rgba(255,255,255,0.08);
        --lk-control-fg: #FFFFFF;
        --lk-control-hover-bg: rgba(90,44,160,0.55);
        --lk-control-active-bg: #5A2CA0;
        --lk-danger-bg: #DC2626;
        --lk-danger-fg: #FFFFFF;
        --lk-border-color: rgba(255,255,255,0.10);
        --lk-radius: 12px;
      }
      [data-lk-theme="ccb"] .lk-disconnect-button {
        background: var(--lk-danger-bg) !important;
        border-radius: 999px !important;
      }
      [data-lk-theme="ccb"] .lk-participant-tile {
        border-radius: 16px;
        overflow: hidden;
      }
      .ccb-meet-grid {
        display: grid;
        gap: 6px; padding: 6px;
        width: 100%; box-sizing: border-box;
        align-content: start;
        grid-template-columns: repeat(2, 1fr);
      }
      .ccb-meet-grid .lk-participant-tile {
        min-height: 0 !important; min-width: 0 !important;
        width: 100% !important; height: auto !important;
        aspect-ratio: 1 / 1 !important;
        border-radius: 12px !important;
        overflow: hidden !important;
      }
      @media (max-width: 380px)  { .ccb-meet-grid { grid-template-columns: repeat(3, 1fr); } }
      @media (min-width: 381px) and (max-width: 640px)  { .ccb-meet-grid { grid-template-columns: repeat(3, 1fr); } }
      @media (min-width: 641px) and (max-width: 1023px) { .ccb-meet-grid { grid-template-columns: repeat(4, 1fr); } }
      @media (min-width: 1024px) { .ccb-meet-grid { grid-template-columns: repeat(5, 1fr); } }
      .ccb-meet-grid .lk-participant-placeholder { font-size: clamp(24px, 8vw, 56px) !important; }
      .ccb-meet-grid .lk-participant-name {
        font-size: clamp(10px, 2.5vw, 13px) !important;
        white-space: nowrap !important; overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      [data-lk-theme="ccb"] .lk-control-bar {
        background: rgba(15,10,31,0.95) !important;
        border-top: 1px solid rgba(255,255,255,0.06);
        padding: 10px !important;
      }
      ${isAudio ? `
        [data-lk-theme="ccb"] .ccb-meet-grid video,
        [data-lk-theme="ccb"] .lk-camera-button,
        [data-lk-theme="ccb"] .lk-button[data-lk-source="camera"],
        [data-lk-theme="ccb"] .lk-button[data-lk-source="screen_share"],
        [data-lk-theme="ccb"] .lk-screen-share-button {
          display: none !important;
        }
        [data-lk-theme="ccb"] .lk-participant-tile {
          background: linear-gradient(135deg, #5A2CA0, #3E1C70) !important;
        }
      ` : ""}
    `}</style>
  );
}
