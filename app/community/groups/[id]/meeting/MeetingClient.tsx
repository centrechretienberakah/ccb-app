"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { GROUPS_THEME as T, GROUPS_FONTS as F } from "@/lib/groups/theme";

interface Group { id: string; name: string; type: "public" | "private"; description: string | null }

interface Props {
  group: Group;
  displayName: string;
  avatarUrl: string;
  userEmail: string;
}

// Types minimaux pour l'API Jitsi
interface JitsiAPI {
  dispose: () => void;
  addListener: (event: string, cb: () => void) => void;
  executeCommand: (cmd: string, ...args: unknown[]) => void;
}
interface JitsiAPIConstructor {
  new (domain: string, options: Record<string, unknown>): JitsiAPI;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiAPIConstructor;
  }
}

export default function MeetingClient({ group, displayName, avatarUrl, userEmail }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nom de salle déterministe et collision-resistant
  // (URL Jitsi : https://meet.jit.si/CCB-Berakah-Group-{id})
  const roomName = `CCB-Berakah-Group-${group.id}`;

  function initJitsi() {
    if (!window.JitsiMeetExternalAPI || !containerRef.current || apiRef.current) return;
    try {
      const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        userInfo: {
          displayName,
          email: userEmail,
        },
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          prejoinPageEnabled: true,
          disableDeepLinking: true,
          subject: group.name,
        },
        interfaceConfigOverwrite: {
          DEFAULT_BACKGROUND: "#5A2CA0",
          DEFAULT_LOCAL_DISPLAY_NAME: displayName,
          DEFAULT_REMOTE_DISPLAY_NAME: "Membre CCB",
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          TOOLBAR_BUTTONS: [
            "microphone", "camera", "closedcaptions", "desktop", "fullscreen",
            "fodeviceselection", "hangup", "profile", "chat", "raisehand",
            "videoquality", "filmstrip", "tileview", "select-background",
          ],
        },
      });
      apiRef.current = api;
      api.addListener("readyToClose", () => {
        // Quand l'utilisateur quitte la réunion
        window.location.href = `/community/groups/${group.id}`;
      });
      setReady(true);
    } catch (e) {
      setError("Impossible de charger Jitsi : " + (e as Error).message);
    }
  }

  useEffect(() => {
    return () => {
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch { /* noop */ }
        apiRef.current = null;
      }
    };
  }, []);

  // Si l'avatar est dispo on l'utilise (Jitsi le récupère via Gravatar email, donc skip)
  void avatarUrl;

  return (
    <div style={{
      background: "#000", color: "#fff", fontFamily: F.body,
      height: "100vh", display: "flex", flexDirection: "column",
    }}>
      {/* Header compact */}
      <div style={{
        background: T.violet, color: "#fff",
        padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: T.shadowMd, flexShrink: 0,
      }}>
        <Link href={`/community/groups/${group.id}`} style={{
          background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 8, padding: "6px 12px",
          color: "#fff", fontSize: 12, fontWeight: 700,
          textDecoration: "none",
        }}>← Retour</Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: F.title, fontSize: 14, fontWeight: 700,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            🎥 {group.name}
          </div>
          <div style={{ fontSize: 10, opacity: 0.8 }}>
            Salle : {roomName}
          </div>
        </div>
        <div style={{
          background: "#dc2626", color: "#fff",
          padding: "3px 10px", borderRadius: 999,
          fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
          animation: "ccb-pulse 2s ease-in-out infinite",
        }}>
          ● LIVE
        </div>
        <style>{`
          @keyframes ccb-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.55 } }
        `}</style>
      </div>

      {/* Container Jitsi */}
      <div style={{ flex: 1, position: "relative", background: "#0a0a0a" }}>
        {error ? (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, textAlign: "center", color: "#fff",
          }}>
            <div>
              <div style={{ fontSize: 44, marginBottom: 10 }}>⚠️</div>
              <div style={{ fontSize: 14, marginBottom: 14 }}>{error}</div>
              <Link href={`/community/groups/${group.id}`} style={{
                display: "inline-block",
                background: T.violet, color: "#fff",
                padding: "10px 22px", borderRadius: 10,
                fontWeight: 700, textDecoration: "none",
              }}>Retour au groupe</Link>
            </div>
          </div>
        ) : (
          <>
            {!ready && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 14,
              }}>
                <div style={{ textAlign: "center" }}>
                  <style>{`@keyframes ccb-spin { to { transform: rotate(360deg); } }`}</style>
                  <div style={{
                    width: 40, height: 40, border: "3px solid rgba(255,255,255,0.2)",
                    borderTopColor: T.gold, borderRadius: "50%",
                    animation: "ccb-spin 0.9s linear infinite", margin: "0 auto 14px",
                  }} />
                  Chargement de la réunion…
                </div>
              </div>
            )}
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
          </>
        )}
      </div>

      {/* Script Jitsi loaded once at the top */}
      <Script
        src="https://meet.jit.si/external_api.js"
        strategy="afterInteractive"
        onLoad={initJitsi}
        onError={() => setError("Échec du chargement du script Jitsi")}
      />
    </div>
  );
}
