"use client";

import "@livekit/components-styles";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  PreJoin,
  RoomAudioRenderer,
  formatChatMessageLinks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import { GROUPS_THEME as T, GROUPS_FONTS as F } from "@/lib/groups/theme";

interface Group {
  id: string;
  name: string;
  type: "public" | "private";
  description: string | null;
}

interface Props {
  group: Group;
  displayName: string;
  avatarUrl: string;
  userEmail: string;
  mode?: "audio" | "video";
}

interface TokenResponse {
  token: string;
  url: string;
  room: string;
  identity: string;
  displayName: string;
}

export default function MeetingClient({ group, displayName: initialDisplayName, avatarUrl, userEmail, mode = "video" }: Props) {
  const router = useRouter();
  const isAudio = mode === "audio";

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [joined, setJoined] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  // Préférence utilisateur (PreJoin)
  const [userName, setUserName] = useState(initialDisplayName || "Membre CCB");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(!isAudio);

  // Fetch token au démarrage
  async function fetchToken() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id, mode }),
      });
      if (res.status === 503) {
        setSetupNeeded(true);
        setConnecting(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error ?? `HTTP ${res.status}`;
        const details = data.details ? ` (${String(data.details).slice(0, 200)})` : "";
        setError(msg + details);
        setConnecting(false);
        return;
      }
      const data = (await res.json()) as TokenResponse;
      setToken(data.token);
      setServerUrl(data.url);
      if (data.displayName) setUserName(data.displayName);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }

  useEffect(() => {
    void fetchToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id, mode]);

  void avatarUrl;
  void userEmail;

  // ─── Tracking de la session côté DB ────────────────────────────────
  async function recordJoin() {
    const supabase = createClient();
    try {
      const { data } = await supabase.rpc("meet_session_join", {
        p_group_id: group.id,
        p_mode: mode,
      });
      if (typeof data === "string") sessionIdRef.current = data;
    } catch { /* RPC pas migré → silencieux */ }
  }

  async function recordLeave() {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const supabase = createClient();
      await supabase.rpc("meet_session_user_leave", { p_session_id: sid });
    } catch { /* noop */ }
    sessionIdRef.current = null;
  }

  // Filet de sécurité : si l'utilisateur ferme l'onglet brutalement
  useEffect(() => {
    function onUnload() {
      const sid = sessionIdRef.current;
      if (!sid) return;
      // navigator.sendBeacon serait idéal mais Supabase RPC ne s'y prête pas.
      // Fire-and-forget keepalive fetch via service_role n'est pas accessible
      // → on accepte que le close_stale cleanup (6h) prenne le relais
      // au pire des cas.
      try {
        const supabase = createClient();
        void supabase.rpc("meet_session_user_leave", { p_session_id: sid });
      } catch { /* noop */ }
    }
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      // Sur cleanup (navigation interne), on enregistre aussi
      void recordLeave();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id]);

  function handleDisconnect() {
    void recordLeave();
    router.push(`/community/groups/${group.id}`);
  }

  function handlePreJoinSubmit(values: { username: string; audioEnabled: boolean; videoEnabled: boolean }) {
    setUserName(values.username || initialDisplayName || "Membre CCB");
    setAudioEnabled(values.audioEnabled);
    // En mode audio, on FORCE videoEnabled à false même si l'utilisateur
    // a réussi à toggler le bouton caméra dans la PreJoin (sécurité UX).
    setVideoEnabled(isAudio ? false : values.videoEnabled);
    setJoined(true);
    void recordJoin();
  }

  // ─── États : config manquante, erreur, chargement ─────────────────
  if (setupNeeded) {
    return (
      <ScreenShell mode={mode} title={group.name}>
        <SetupScreen onBack={() => router.push(`/community/groups/${group.id}`)} />
      </ScreenShell>
    );
  }
  if (error) {
    return (
      <ScreenShell mode={mode} title={group.name}>
        <ErrorScreen error={error} onRetry={fetchToken}
          onBack={() => router.push(`/community/groups/${group.id}`)} />
      </ScreenShell>
    );
  }
  if (connecting || !token || !serverUrl) {
    return (
      <ScreenShell mode={mode} title={group.name}>
        <LoadingScreen mode={mode} groupName={group.name} />
      </ScreenShell>
    );
  }

  // ─── PreJoin : permet de tester audio/video avant de joindre ──────
  if (!joined) {
    return (
      <ScreenShell mode={mode} title={group.name} hideHeader>
        <div data-lk-theme="ccb" style={{
          height: "100dvh",
          background: "#0F0A1F",
          display: "flex", flexDirection: "column",
        }}>
          {/* Header simple */}
          <div style={lobbyHeaderStyle}>
            <Link href={`/community/groups/${group.id}`} aria-label="Retour"
              style={lobbyBackStyle}>←</Link>
            <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
              <div style={{ fontFamily: F.title, fontSize: 14, fontWeight: 700, letterSpacing: 0.4 }}>
                {isAudio ? "📞" : "🎥"} {group.name}
              </div>
              <div style={{ fontSize: 10.5, opacity: 0.7 }}>
                {isAudio ? "Appel vocal CCB" : "Réunion vidéo CCB"} · CCB MEET
              </div>
            </div>
            <div style={{ width: 36 }} />
          </div>

          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PreJoin
              defaults={{
                username: userName,
                videoEnabled: videoEnabled && !isAudio,
                audioEnabled: audioEnabled,
              }}
              onSubmit={handlePreJoinSubmit}
              joinLabel={isAudio ? "Rejoindre l'appel" : "Rejoindre la réunion"}
              micLabel="Micro"
              camLabel={isAudio ? "Caméra (désactivée en mode appel)" : "Caméra"}
              userLabel="Ton nom"
            />
          </div>
        </div>
      </ScreenShell>
    );
  }

  // ─── In-call : LiveKitRoom + VideoConference ──────────────────────
  return (
    <div data-lk-theme="ccb" style={{ height: "100dvh", background: "#0F0A1F" }}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        video={!isAudio && videoEnabled}
        audio={audioEnabled}
        connectOptions={{ autoSubscribe: true }}
        options={{
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            // mode audio-only : empêche aussi la souscription des vidéos distantes
            videoCodec: "vp9",
            audioPreset: { maxBitrate: 32_000 }, // 32 kbps suffit en parole
          },
        }}
        onDisconnected={handleDisconnect}
        data-lk-theme="ccb"
        style={{ height: "100%" }}>
        <RoomAudioRenderer />
        <VideoConference
          chatMessageFormatter={formatChatMessageLinks}
        />
      </LiveKitRoom>
      <CcbBrandingStyles isAudio={isAudio} />
    </div>
  );
}

// ─── Écrans : Setup / Erreur / Chargement ──────────────────────────
function ScreenShell({ children, mode, title, hideHeader = false }: {
  children: React.ReactNode; mode: "audio" | "video"; title: string; hideHeader?: boolean;
}) {
  return (
    <div style={{
      height: "100dvh", background: "#0F0A1F", color: "#fff",
      fontFamily: F.body, display: "flex", flexDirection: "column",
    }}>
      {!hideHeader && (
        <div style={lobbyHeaderStyle}>
          <Link href={`/community/groups/${title}`} aria-label="Retour"
            style={lobbyBackStyle}>←</Link>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: F.title, fontSize: 14, fontWeight: 700, letterSpacing: 0.4 }}>
              {mode === "audio" ? "📞 Appel vocal" : "🎥 Réunion vidéo"}
            </div>
            <div style={{ fontSize: 10.5, opacity: 0.7 }}>CCB MEET</div>
          </div>
          <div style={{ width: 36 }} />
        </div>
      )}
      {children}
    </div>
  );
}

function LoadingScreen({ mode, groupName }: { mode: "audio" | "video"; groupName: string }) {
  return (
    <div style={loadCenterStyle}>
      <style>{`@keyframes ccb-mt-spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        border: "3px solid rgba(255,255,255,0.12)",
        borderTopColor: T.gold,
        animation: "ccb-mt-spin 0.9s linear infinite",
        marginBottom: 18,
      }} />
      <div style={{ fontFamily: F.title, fontSize: 17, fontWeight: 700, marginBottom: 4, color: "#fff" }}>
        Connexion à CCB MEET…
      </div>
      <div style={{ fontSize: 12.5, opacity: 0.7, color: "#fff" }}>
        {mode === "audio" ? "Appel vocal" : "Réunion vidéo"} · {groupName}
      </div>
    </div>
  );
}

function ErrorScreen({ error, onRetry, onBack }: { error: string; onRetry: () => void; onBack: () => void }) {
  return (
    <div style={loadCenterStyle}>
      <div style={{ fontSize: 48, marginBottom: 14 }}>⚠️</div>
      <div style={{ fontFamily: F.title, fontSize: 17, fontWeight: 700, marginBottom: 6, color: "#fff" }}>
        Impossible de rejoindre
      </div>
      <div style={{ fontSize: 12.5, opacity: 0.78, marginBottom: 22, maxWidth: 380, textAlign: "center", padding: "0 20px", color: "#fff" }}>
        {error}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onRetry} style={primaryBtnStyle}>Réessayer</button>
        <button onClick={onBack} style={ghostBtnStyle}>Retour au groupe</button>
      </div>
    </div>
  );
}

function SetupScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ ...loadCenterStyle, padding: "30px 22px" }}>
      <div style={{ fontSize: 48, marginBottom: 14 }}>⚙️</div>
      <div style={{ fontFamily: F.title, fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#fff" }}>
        CCB MEET — Configuration requise
      </div>
      <div style={{
        fontSize: 13, opacity: 0.85, lineHeight: 1.6,
        maxWidth: 480, textAlign: "left", color: "#fff",
        background: "rgba(255,255,255,0.05)", padding: "16px 18px",
        borderRadius: 14, marginBottom: 20,
      }}>
        Pour activer les appels et réunions, configure LiveKit Cloud :
        <ol style={{ paddingLeft: 18, marginTop: 8, marginBottom: 0 }}>
          <li>Crée un projet gratuit sur <strong>livekit.io</strong></li>
          <li>Récupère ton WS URL + API Key + API Secret</li>
          <li>Ajoute dans Vercel :
            <pre style={{ background: "rgba(0,0,0,0.4)", padding: 8, borderRadius: 6, fontSize: 11, margin: "4px 0", overflowX: "auto" }}>
{`LIVEKIT_URL=https://...livekit.cloud
LIVEKIT_API_KEY=AP...
LIVEKIT_API_SECRET=...
NEXT_PUBLIC_LIVEKIT_URL=https://...livekit.cloud`}
            </pre>
          </li>
          <li>Redéploie</li>
        </ol>
      </div>
      <button onClick={onBack} style={primaryBtnStyle}>← Retour au groupe</button>
    </div>
  );
}

// ─── CCB branding via CSS variables LiveKit ────────────────────────
function CcbBrandingStyles({ isAudio }: { isAudio: boolean }) {
  return (
    <style>{`
      /* LiveKit theme override — full CCB branding */
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
        font-family: var(--font-montserrat), system-ui, sans-serif;
      }
      [data-lk-theme="ccb"] .lk-button {
        font-family: inherit;
      }
      [data-lk-theme="ccb"] .lk-button-group .lk-button {
        background: var(--lk-control-bg);
        color: var(--lk-control-fg);
        border-radius: 999px;
      }
      [data-lk-theme="ccb"] .lk-button-group .lk-button[aria-pressed="true"],
      [data-lk-theme="ccb"] .lk-button-group .lk-button[data-lk-source="true"] {
        background: var(--lk-accent-bg);
      }
      [data-lk-theme="ccb"] .lk-disconnect-button {
        background: var(--lk-danger-bg) !important;
        border-radius: 999px !important;
      }
      [data-lk-theme="ccb"] .lk-participant-name {
        font-family: var(--font-cinzel), Georgia, serif;
        letter-spacing: 0.4px;
      }
      [data-lk-theme="ccb"] .lk-participant-tile {
        border-radius: 16px;
        overflow: hidden;
      }
      ${isAudio ? `
        /* ─── MODE AUDIO : masque TOUT ce qui touche à la caméra ─── */
        /* 1. PreJoin — masque la preview vidéo et le bouton caméra */
        [data-lk-theme="ccb"] .lk-prejoin .lk-camera-button,
        [data-lk-theme="ccb"] .lk-prejoin video,
        [data-lk-theme="ccb"] .lk-prejoin .lk-video-container,
        [data-lk-theme="ccb"] .lk-prejoin [data-lk-source="camera"],
        [data-lk-theme="ccb"] .lk-prejoin label:has(input[name*="video"]) {
          display: none !important;
        }
        /* 2. En appel — masque toutes les vidéos + boutons caméra/écran */
        [data-lk-theme="ccb"] .lk-grid-layout video,
        [data-lk-theme="ccb"] .lk-focus-layout video,
        [data-lk-theme="ccb"] .lk-camera-button,
        [data-lk-theme="ccb"] .lk-button[data-lk-source="camera"],
        [data-lk-theme="ccb"] .lk-button[data-lk-source="screen_share"],
        [data-lk-theme="ccb"] .lk-screen-share-button,
        [data-lk-theme="ccb"] .lk-camera-preset-select,
        [data-lk-theme="ccb"] .lk-toggle-source-button[data-lk-source="camera"] {
          display: none !important;
        }
        /* 3. Tile = grand avatar carré dégradé violet, plus immersif */
        [data-lk-theme="ccb"] .lk-participant-tile {
          background: linear-gradient(135deg, #5A2CA0, #3E1C70);
          aspect-ratio: 1;
          max-width: 320px;
          margin: auto;
        }
        [data-lk-theme="ccb"] .lk-participant-tile .lk-participant-placeholder {
          font-size: 56px;
        }
      ` : ""}
    `}</style>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
const lobbyHeaderStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "12px 14px",
  background: "rgba(0,0,0,0.4)",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  color: "#fff",
  flexShrink: 0,
  backdropFilter: "blur(8px)",
};
const lobbyBackStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 999,
  background: "rgba(255,255,255,0.10)", color: "#fff",
  textDecoration: "none",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontSize: 18, flexShrink: 0,
};
const loadCenterStyle: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
  color: "#fff", padding: "0 20px", textAlign: "center",
};
const primaryBtnStyle: React.CSSProperties = {
  background: T.violet, color: "#fff",
  border: "none", borderRadius: 12,
  padding: "12px 22px", fontWeight: 700, fontSize: 13.5,
  cursor: "pointer", fontFamily: F.body,
  boxShadow: "0 4px 14px rgba(90,44,160,0.45)",
};
const ghostBtnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.10)", color: "#fff",
  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12,
  padding: "12px 22px", fontWeight: 700, fontSize: 13.5,
  cursor: "pointer", fontFamily: F.body,
};

// Empêche le warning lint sur l'export indirect
void Track;
