"use client";

/**
 * MeetingClient — devenu un simple "trigger" pour le CallContext global.
 *
 * Avant : ce composant mountait son propre <LiveKitRoom>, donc naviguer
 *         hors de /meeting déconnectait l'utilisateur.
 * Maintenant : le LiveKitRoom est géré par <PersistentCallHost /> au
 *         niveau du layout, ce composant déclenche juste startCall() et
 *         affiche un état (chargement / setup requis / erreur).
 *
 * Le rendu in-call (FullStage) est fait par PersistentCallHost.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCall } from "@/lib/meet/CallContext";
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

export default function MeetingClient({ group, displayName, mode = "video" }: Props) {
  const router = useRouter();
  const { state, startCall } = useCall();

  // Déclenche l'appel via le contexte global au mount
  useEffect(() => {
    if (state.active && state.groupId === group.id && state.mode === mode) return;
    void startCall({
      groupId: group.id,
      groupName: group.name,
      mode,
      displayName,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id, mode]);

  // Setup manquant (LiveKit non configuré) — l'API renvoie status=503
  if (state.status === "error" && state.error?.includes("non configuré")) {
    return <SetupScreen onBack={() => router.push(`/community/groups/${group.id}`)} />;
  }
  if (state.status === "error") {
    return (
      <ScreenShell mode={mode}>
        <div style={loadCenterStyle}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>⚠️</div>
          <div style={{ fontFamily: F.title, fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            Impossible de rejoindre
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.78, marginBottom: 22, maxWidth: 380, textAlign: "center", padding: "0 20px", color: "#fff" }}>
            {state.error}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => void startCall({ groupId: group.id, groupName: group.name, mode, displayName })}
              style={primaryBtnStyle}>Réessayer</button>
            <button onClick={() => router.push(`/community/groups/${group.id}`)}
              style={ghostBtnStyle}>Retour au groupe</button>
          </div>
        </div>
      </ScreenShell>
    );
  }

  // Chargement (fetching token ou connecting) — le FullStage du
  // PersistentCallHost va s'afficher dès que state.active = true
  if (!state.active || state.status === "fetching" || state.status === "connecting") {
    return (
      <ScreenShell mode={mode}>
        <div style={loadCenterStyle}>
          <style>{`@keyframes ccb-mt-spin { to { transform: rotate(360deg) } }`}</style>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.12)",
            borderTopColor: T.gold,
            animation: "ccb-mt-spin 0.9s linear infinite",
            marginBottom: 18,
          }} />
          <div style={{ fontFamily: F.title, fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            Connexion à CCB MEET…
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.7, color: "#fff" }}>
            {mode === "audio" ? "Appel vocal" : "Réunion vidéo"} · {group.name}
          </div>
        </div>
      </ScreenShell>
    );
  }

  // Appel actif : le PersistentCallHost rend déjà le FullStage par-dessus.
  // On rend juste un placeholder transparent.
  return null;
}

function ScreenShell({ children, mode }: { children: React.ReactNode; mode: "audio" | "video" }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#0F0A1F", color: "#fff",
      fontFamily: F.body, display: "flex", flexDirection: "column",
      zIndex: 199,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px",
        background: "rgba(0,0,0,0.4)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0, backdropFilter: "blur(8px)",
      }}>
        <Link href="/community/groups" aria-label="Retour"
          style={{
            width: 36, height: 36, borderRadius: 999,
            background: "rgba(255,255,255,0.10)", color: "#fff",
            textDecoration: "none",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>←</Link>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: F.title, fontSize: 14, fontWeight: 700, letterSpacing: 0.4 }}>
            {mode === "audio" ? "📞 Appel vocal" : "🎥 Réunion vidéo"}
          </div>
          <div style={{ fontSize: 10.5, opacity: 0.7 }}>CCB MEET</div>
        </div>
        <div style={{ width: 36 }} />
      </div>
      {children}
    </div>
  );
}

function SetupScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenShell mode="video">
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
    </ScreenShell>
  );
}

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
