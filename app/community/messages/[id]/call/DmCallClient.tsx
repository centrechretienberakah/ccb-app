"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCall } from "@/lib/meet/CallContext";
import { GROUPS_THEME as T, GROUPS_FONTS as F } from "@/lib/groups/theme";

interface Props {
  conversationId: string;
  title: string;        // nom de l'interlocuteur
  mode: "audio" | "video";
  myName: string;
}

/**
 * Déclencheur d'appel PRIVÉ (DM). Comme MeetingClient pour les groupes,
 * il déclenche startCall() via le CallContext global ; le rendu in-call
 * (FullStage) est assuré par <PersistentCallHost>. L'appel survit à la
 * navigation (mini-player) et réutilise toute l'infra CCB Meet.
 */
export default function DmCallClient({ conversationId, title, mode, myName }: Props) {
  const router = useRouter();
  const { state, startCall } = useCall();
  const backUrl = `/community/messages/${conversationId}`;

  useEffect(() => {
    if (state.active && state.conversationId === conversationId && state.mode === mode) return;
    void startCall({
      conversationId,
      groupName: title,     // sert de titre affiché
      mode,
      displayName: myName,
      backUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, mode]);

  if (state.status === "error" && state.error?.includes("non configuré")) {
    return (
      <Shell mode={mode} backUrl={backUrl}>
        <div style={center}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>⚙️</div>
          <div style={{ fontFamily: F.title, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            CCB MEET — Configuration requise
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, maxWidth: 420, textAlign: "center" }}>
            Les appels nécessitent LiveKit Cloud (variables LIVEKIT_* dans Vercel).
          </div>
          <Link href={backUrl} style={btn}>← Retour à la conversation</Link>
        </div>
      </Shell>
    );
  }
  if (state.status === "error") {
    return (
      <Shell mode={mode} backUrl={backUrl}>
        <div style={center}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>⚠️</div>
          <div style={{ fontFamily: F.title, fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
            Impossible de démarrer l&apos;appel
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.78, marginBottom: 18, maxWidth: 380, textAlign: "center" }}>
            {state.error}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => void startCall({ conversationId, groupName: title, mode, displayName: myName, backUrl })} style={btn}>
              Réessayer
            </button>
            <button onClick={() => router.push(backUrl)} style={{ ...btn, background: "rgba(255,255,255,0.12)" }}>
              Retour
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // Chargement — le FullStage du PersistentCallHost prend le relais
  return (
    <Shell mode={mode} backUrl={backUrl}>
      <div style={center}>
        <style>{`@keyframes ccb-dm-spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{
          width: 54, height: 54, borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.12)", borderTopColor: T.gold,
          animation: "ccb-dm-spin 0.9s linear infinite", marginBottom: 16,
        }} />
        <div style={{ fontFamily: F.title, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
          {mode === "audio" ? "📞 Appel vocal" : "📹 Appel vidéo"}
        </div>
        <div style={{ fontSize: 12.5, opacity: 0.7 }}>Connexion avec {title}…</div>
      </div>
    </Shell>
  );
}

function Shell({ children, mode, backUrl }: { children: React.ReactNode; mode: "audio" | "video"; backUrl: string }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0F0A1F", color: "#fff",
      fontFamily: F.body, display: "flex", flexDirection: "column", zIndex: 199,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
        background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
      }}>
        <Link href={backUrl} aria-label="Retour" style={{
          width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.10)",
          color: "#fff", textDecoration: "none", display: "inline-flex",
          alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>←</Link>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: F.title, fontSize: 14, fontWeight: 700 }}>
            {mode === "audio" ? "📞 Appel vocal" : "📹 Appel vidéo"}
          </div>
          <div style={{ fontSize: 10.5, opacity: 0.7 }}>CCB MEET · Privé</div>
        </div>
        <div style={{ width: 36 }} />
      </div>
      {children}
    </div>
  );
}

const center: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", color: "#fff", padding: "0 20px",
};
const btn: React.CSSProperties = {
  marginTop: 16, background: T.violet, color: "#fff", border: "none",
  borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 13.5,
  cursor: "pointer", fontFamily: F.body, textDecoration: "none",
};
