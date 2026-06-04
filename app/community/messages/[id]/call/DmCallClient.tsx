"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCall } from "@/lib/meet/CallContext";
import { createClient } from "@/lib/supabase/client";
import { ringCall, setCallStatus, pushCallNotification, type CallRow } from "@/lib/meet/calls";
import { startRingtone, stopRingtone } from "@/lib/meet/ringtone";
import { GROUPS_THEME as T, GROUPS_FONTS as F } from "@/lib/groups/theme";

interface Props {
  conversationId: string;
  title: string;        // nom de l'interlocuteur
  mode: "audio" | "video";
  myName: string;
  join?: boolean;       // true = on rejoint (accepteur) → pas de sonnerie
}

type Phase = "ringing" | "declined" | "missed" | "joining";

/**
 * Appel PRIVÉ (DM) — façon WhatsApp.
 *
 * APPELANT (join=false) : crée un appel "ringing" (le destinataire reçoit
 *   l'écran d'appel entrant via IncomingCallHost + sonnerie). On ne rejoint
 *   la room LiveKit QU'À l'acceptation. Refus/timeout → écran dédié.
 * ACCEPTEUR (join=true) : rejoint directement la room (startCall).
 *
 * Le rendu in-call (FullStage) reste assuré par <PersistentCallHost>.
 */
export default function DmCallClient({ conversationId, title, mode, myName, join = false }: Props) {
  const router = useRouter();
  const { state, startCall } = useCall();
  const backUrl = `/community/messages/${conversationId}`;
  const [phase, setPhase] = useState<Phase>(join ? "joining" : "ringing");
  const callIdRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  const doStartCall = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void startCall({ conversationId, groupName: title, mode, displayName: myName, backUrl });
  }, [conversationId, title, mode, myName, backUrl, startCall]);

  useEffect(() => {
    // Accepteur → rejoint directement
    if (join) { doStartCall(); return; }

    // Appelant → sonnerie + attente de réponse
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    const sb = createClient();
    startRingtone();

    (async () => {
      const call = await ringCall({ conversationId, type: mode });
      if (cancelled) return;
      if (!call) {
        // Table v57 non migrée → repli sur l'ancien comportement (join direct)
        stopRingtone();
        setPhase("joining");
        doStartCall();
        return;
      }
      callIdRef.current = call.id;
      void pushCallNotification({ type: mode, callerName: myName, conversationId });

      timeout = setTimeout(() => {
        if (cancelled) return;
        void setCallStatus(call.id, "missed");
        stopRingtone();
        setPhase("missed");
        setTimeout(() => router.replace(backUrl), 2600);
      }, 30_000);

      channel = sb.channel(`ccb-call-${call.id}`);
      channel.on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${call.id}` },
        (payload) => {
          if (cancelled) return;
          const c = payload.new as CallRow;
          if (c.status === "accepted") {
            stopRingtone(); if (timeout) clearTimeout(timeout);
            setPhase("joining"); doStartCall();
          } else if (c.status === "declined") {
            stopRingtone(); if (timeout) clearTimeout(timeout);
            setPhase("declined"); setTimeout(() => router.replace(backUrl), 2600);
          } else if (c.status === "missed" || c.status === "ended") {
            stopRingtone(); if (timeout) clearTimeout(timeout);
            setPhase("missed"); setTimeout(() => router.replace(backUrl), 2600);
          }
        });
      channel.subscribe();
    })();

    return () => {
      cancelled = true;
      stopRingtone();
      if (timeout) clearTimeout(timeout);
      if (channel) { try { channel.unsubscribe(); } catch { /* noop */ } }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, mode, join]);

  function cancelCall() {
    const id = callIdRef.current;
    if (id) void setCallStatus(id, "ended");
    stopRingtone();
    router.replace(backUrl);
  }

  // ── Erreurs LiveKit (surviennent au moment de rejoindre) ──
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
          <Link href={backUrl} replace style={btn}>← Retour à la conversation</Link>
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
            <button onClick={() => { startedRef.current = false; doStartCall(); }} style={btn}>Réessayer</button>
            <button onClick={() => router.replace(backUrl)} style={{ ...btn, background: "rgba(255,255,255,0.12)" }}>Retour</button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Appelant : sonnerie ──
  if (!join && phase === "ringing") {
    const initials = (title || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return (
      <CallerShell>
        <div style={{ fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.7, fontWeight: 700 }}>
          {mode === "audio" ? "📞 Appel vocal" : "📹 Appel vidéo"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 124, height: 124, borderRadius: "50%",
            background: "linear-gradient(135deg, #5A2CA0, #3E1C70)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 42, fontWeight: 800, color: "#fff",
            border: "3px solid rgba(212,175,55,0.8)",
            animation: "ccb-caller-pulse 1.8s ease-in-out infinite",
          }}>{initials}</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: F.title }}>{title}</div>
            <div style={{ fontSize: 13.5, opacity: 0.7, marginTop: 6 }}>Sonnerie… en attente de réponse</div>
          </div>
        </div>
        <button onClick={cancelCall} style={{
          width: 70, height: 70, borderRadius: "50%", background: "#DC2626", color: "#fff",
          border: "none", cursor: "pointer", fontSize: 30, transform: "rotate(135deg)",
          boxShadow: "0 8px 24px rgba(220,38,38,0.45)",
        }} aria-label="Annuler l'appel">📞</button>
      </CallerShell>
    );
  }

  // ── Appelant : refusé / sans réponse ──
  if (!join && (phase === "declined" || phase === "missed")) {
    return (
      <CallerShell>
        <div style={{ fontSize: 54 }}>{phase === "declined" ? "🚫" : "📵"}</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: F.title }}>
            {phase === "declined" ? "Appel refusé" : "Sans réponse"}
          </div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>{title}</div>
        </div>
        <button onClick={() => router.replace(backUrl)} style={{
          background: "rgba(255,255,255,0.12)", color: "#fff", border: "none",
          borderRadius: 12, padding: "11px 22px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: F.body,
        }}>← Retour à la conversation</button>
      </CallerShell>
    );
  }

  // ── Connexion à la room (l'écran FullStage du PersistentCallHost prend le relais) ──
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

function CallerShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 199,
      background: "linear-gradient(160deg, #1A1230 0%, #0F0A1F 100%)", color: "#fff",
      fontFamily: F.body, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "space-between",
      padding: "calc(54px + env(safe-area-inset-top,0px)) 22px calc(44px + env(safe-area-inset-bottom,0px))",
    }}>
      <style>{`@keyframes ccb-caller-pulse { 0%,100%{ transform: scale(1);} 50%{ transform: scale(1.05);} }`}</style>
      {children}
    </div>
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
        <Link href={backUrl} replace aria-label="Retour" style={{
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
