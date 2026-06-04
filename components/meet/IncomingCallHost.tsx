"use client";

/**
 * IncomingCallHost — always-mounted (layout). Écoute la table `calls` via
 * Supabase Realtime et affiche un écran plein écran « APPEL ENTRANT » avec
 * sonnerie + Accepter/Refuser (DM) ou Rejoindre/Ignorer (groupe).
 *
 * Couche purement additive : la room LiveKit reste gérée par CallContext /
 * PersistentCallHost. Ici on ne fait QUE la signalisation (sonnerie).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setCallStatus, type CallRow } from "@/lib/meet/calls";
import { startRingtone, stopRingtone, primeRingtone } from "@/lib/meet/ringtone";

const RING_TIMEOUT_MS = 30_000;

export default function IncomingCallHost() {
  const router = useRouter();
  const pathname = usePathname();
  const [incoming, setIncoming] = useState<CallRow | null>(null);
  const myIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomingRef = useRef<CallRow | null>(null);

  // pathname dans une ref pour la closure du subscribe (pas de re-subscribe)
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const clearRingTimeout = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  const dismiss = useCallback(() => {
    stopRingtone();
    clearRingTimeout();
    incomingRef.current = null;
    setIncoming(null);
  }, [clearRingTimeout]);

  // Réception d'un appel entrant
  const onIncoming = useCallback((call: CallRow) => {
    // déjà un appel affiché → on ignore le nouvel entrant (occupé)
    if (incomingRef.current) return;
    // si on est déjà dans une page d'appel/réunion → ne pas superposer
    const p = pathRef.current || "";
    if (/\/call(\?|$)/.test(p) || /\/meeting(\?|$)/.test(p) || p.includes("/call") || p.includes("/meeting")) return;
    incomingRef.current = call;
    setIncoming(call);
    startRingtone();
    clearRingTimeout();
    timeoutRef.current = setTimeout(() => {
      // Timeout → appel manqué (DM uniquement ; le groupe reste informatif)
      if (!call.group_id) void setCallStatus(call.id, "missed");
      dismiss();
    }, RING_TIMEOUT_MS);
  }, [clearRingTimeout, dismiss]);

  useEffect(() => {
    primeRingtone();
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let cancelled = false;
    const sb = createClient();

    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user || cancelled) return;
      myIdRef.current = user.id;

      channel = sb.channel("ccb-calls-rt");
      // Tous les .on() AVANT .subscribe()
      channel.on("postgres_changes",
        { event: "INSERT", schema: "public", table: "calls" },
        (payload) => {
          const call = payload.new as CallRow;
          if (!call || call.status !== "ringing") return;
          if (call.caller_id === myIdRef.current) return;            // mon propre appel sortant
          if (Date.now() - new Date(call.created_at).getTime() > 35_000) return; // périmé
          onIncoming(call);
        });
      channel.on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls" },
        (payload) => {
          const call = payload.new as CallRow;
          const cur = incomingRef.current;
          if (cur && call.id === cur.id && call.status !== "ringing") {
            dismiss(); // accepté ailleurs / annulé / refusé
          }
        });
      channel.subscribe();
    })();

    return () => {
      cancelled = true;
      stopRingtone();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (channel) { try { channel.unsubscribe(); } catch { /* noop */ } }
    };
  }, [onIncoming, dismiss]);

  if (!incoming) return null;

  const isGroup = !!incoming.group_id;
  const isAudio = incoming.call_type === "audio";
  const callerName = isGroup ? (incoming.group_name || "Groupe CCB") : (incoming.caller_name || "Membre CCB");
  const subtitle = isGroup
    ? `${incoming.caller_name || "Un membre"} démarre ${isAudio ? "un appel" : "une réunion vidéo"}`
    : (isAudio ? "Appel audio" : "Appel vidéo");
  const initials = callerName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  function accept() {
    const call = incoming!;
    stopRingtone();
    clearRingTimeout();
    if (isGroup) {
      // Groupe : pas de statut 1-1 ; on rejoint simplement la réunion
      router.push(`/community/groups/${call.group_id}/meeting${isAudio ? "?mode=audio&join=1" : "?join=1"}`);
    } else {
      void setCallStatus(call.id, "accepted");
      router.push(`/community/messages/${call.conversation_id}/call?mode=${call.call_type}&join=1`);
    }
    incomingRef.current = null;
    setIncoming(null);
  }

  function refuse() {
    const call = incoming!;
    if (!isGroup) void setCallStatus(call.id, "declined");
    dismiss();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000,
      background: "linear-gradient(160deg, #1A1230 0%, #0F0A1F 100%)",
      color: "#fff", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "space-between",
      padding: "calc(48px + env(safe-area-inset-top,0px)) 22px calc(40px + env(safe-area-inset-bottom,0px))",
    }}>
      <style>{`
        @keyframes ccb-call-pulse { 0%,100%{ transform: scale(1); opacity:1;} 50%{ transform: scale(1.06); opacity:.85;} }
        @keyframes ccb-call-ring { 0%{ box-shadow:0 0 0 0 rgba(212,175,55,.5);} 100%{ box-shadow:0 0 0 28px rgba(212,175,55,0);} }
        @keyframes ccb-call-in { from{opacity:0; transform: translateY(10px);} to{opacity:1; transform:none;} }
      `}</style>

      {/* Haut : type d'appel */}
      <div style={{ marginTop: 8, textAlign: "center", animation: "ccb-call-in .3s ease both" }}>
        <div style={{ fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.7, fontWeight: 700 }}>
          {isGroup ? "📞 Appel de groupe" : (isAudio ? "📞 Appel entrant" : "📹 Appel vidéo entrant")}
        </div>
      </div>

      {/* Centre : avatar + nom */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ position: "relative", animation: "ccb-call-pulse 1.8s ease-in-out infinite" }}>
          <div style={{
            width: 132, height: 132, borderRadius: "50%",
            background: incoming.caller_avatar && !isGroup ? "transparent" : "linear-gradient(135deg, #5B21B6, #4C1D95)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 46, fontWeight: 800, color: "#fff",
            border: "3px solid rgba(212,175,55,0.8)", overflow: "hidden",
            animation: "ccb-call-ring 1.6s ease-out infinite",
          }}>
            {incoming.caller_avatar && !isGroup ? (
              <img src={incoming.caller_avatar} alt={callerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (isGroup ? "👥" : initials)}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--font-cinzel), system-ui, sans-serif", letterSpacing: "0.02em" }}>{callerName}</div>
          <div style={{ fontSize: 14, opacity: 0.78, marginTop: 6 }}>{subtitle}</div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 10 }}>CCB Meet · sonnerie…</div>
        </div>
      </div>

      {/* Bas : actions */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 56, width: "100%", maxWidth: 360 }}>
        <ActionBtn color="#DC2626" label={isGroup ? "Ignorer" : "Refuser"} emoji="📞" rotate onClick={refuse} />
        <ActionBtn color="#1FA855" label={isGroup ? "Rejoindre" : "Accepter"} emoji={isAudio ? "📞" : "📹"} onClick={accept} />
      </div>
    </div>
  );
}

function ActionBtn({ color, label, emoji, onClick, rotate }: {
  color: string; label: string; emoji: string; onClick: () => void; rotate?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none", cursor: "pointer", color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    }}>
      <span style={{
        width: 70, height: 70, borderRadius: "50%", background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 30, boxShadow: `0 8px 24px ${color}66`,
        transform: rotate ? "rotate(135deg)" : "none",
      }}>{emoji}</span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
    </button>
  );
}
