"use client";

/**
 * OngoingCallBanner — CTA « Rejoindre l'appel en cours » affiché en tête de
 * l'accueil quand un appel de groupe est actif dans l'un des groupes du membre.
 *
 * Source : POST /api/livekit/active-groups (occupation réelle des rooms LiveKit).
 * Sondage au montage + au retour de focus + toutes les 20 s. On masque le groupe
 * où l'utilisateur est DÉJÀ en appel (le mini-player flottant s'en charge).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCall } from "@/lib/meet/CallContext";

interface OngoingCall {
  groupId: string;
  groupName: string;
  count: number;
  mode: "audio" | "video";
  startedAt: string;
}

function sinceLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!isFinite(ms) || ms < 0) return "à l'instant";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  return `il y a ${h} h`;
}

export default function OngoingCallBanner() {
  const router = useRouter();
  const { state } = useCall();
  const [calls, setCalls] = useState<OngoingCall[]>([]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      try {
        const res = await fetch("/api/livekit/active-groups", { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCalls(Array.isArray(data.calls) ? data.calls : []);
      } catch { /* réseau / LiveKit non configuré → silencieux */ }
    }

    poll();
    timer = setInterval(poll, 20_000);
    const onVisible = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Masque le groupe où l'utilisateur est déjà connecté (mini-player actif).
  const visible = calls.filter((c) => !(state.active && state.groupId === c.groupId));
  if (visible.length === 0) return null;

  return (
    <div className="dashboard-section" style={{ paddingTop: 14, paddingBottom: 0 }}>
      <style>{`
        @keyframes ccb-live-pulse { 0%,100%{ box-shadow:0 0 0 0 rgba(34,197,94,.55);} 70%{ box-shadow:0 0 0 9px rgba(34,197,94,0);} }
        @keyframes ccb-cta-in { from{ opacity:0; transform: translateY(-6px);} to{ opacity:1; transform:none;} }
        .ccb-cta-join:hover { filter: brightness(1.06); }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.map((c) => (
          <button
            key={c.groupId}
            onClick={() => router.push(`/community/groups/${c.groupId}/meeting${c.mode === "audio" ? "?mode=audio" : ""}`)}
            className="ccb-cta-join"
            style={{
              display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "left",
              background: "linear-gradient(135deg, #5B21B6 0%, #4C1D95 100%)",
              color: "#fff", border: "1px solid rgba(212,175,55,0.35)",
              borderRadius: 16, padding: "13px 15px", cursor: "pointer",
              boxShadow: "0 10px 26px rgba(91,33,182,0.28)",
              animation: "ccb-cta-in .3s ease both", fontFamily: "inherit",
            }}
          >
            <span style={{
              position: "relative", flexShrink: 0,
              width: 46, height: 46, borderRadius: "50%",
              background: "rgba(255,255,255,0.14)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              animation: "ccb-live-pulse 1.8s ease-out infinite",
            }}>
              {c.mode === "audio" ? "📞" : "🎥"}
            </span>

            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.92 }}>
                  Appel de groupe en cours
                </span>
              </span>
              <span style={{ display: "block", fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.groupName}
              </span>
              <span style={{ display: "block", fontSize: 12, opacity: 0.82, marginTop: 1 }}>
                👥 {c.count} participant{c.count > 1 ? "s" : ""} · {sinceLabel(c.startedAt)}
              </span>
            </span>

            <span style={{
              flexShrink: 0, background: "#D4AF37", color: "#1A1230",
              fontWeight: 800, fontSize: 13.5, padding: "10px 18px", borderRadius: 999,
              whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(212,175,55,0.4)",
            }}>
              Rejoindre
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
