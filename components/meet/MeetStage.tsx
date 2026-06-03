"use client";

/**
 * MeetStage — écran in-call PREMIUM de CCB Meet (Phase 1 + 2).
 *
 * Rendu dans le <LiveKitRoom> (PersistentCallHost) sur /meeting et /call.
 * Réutilise les composants LiveKit éprouvés — aucune modification de la
 * mécanique d'appel : couche visuelle + signalisation par data channel.
 *
 * Phase 1 : grille adaptative, mode présentation, PiP 1-1, barre flottante.
 * Phase 2 : 💬 chat in-call · 👥 participants · ✋ lever la main ·
 *           📖 partage de verset · 🙏 mode prière (tous synchronisés temps réel).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ParticipantTile,
  TrackToggle,
  DisconnectButton,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useRoomContext,
  useChat,
  useDataChannel,
} from "@livekit/components-react";
import { Track, LocalVideoTrack } from "livekit-client";
import type { Room } from "livekit-client";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { useCall } from "@/lib/meet/CallContext";
import { createClient } from "@/lib/supabase/client";

const VIOLET = "#5A2CA0";
const GOLD = "#D4AF37";
const CARD = "#1E1E1E";

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

function initialsOf(name: string | undefined): string {
  return (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

type Panel = "none" | "chat" | "people" | "settings" | "notes" | "stats";
interface TalkEntry { name: string; secs: number }
interface MeetStats { start: number; peak: number; shares: number; talk: Record<string, TalkEntry> }
interface Verse { ref: string; text: string; by: string }
interface Prayer { topic: string; endsAt: number; by: string }
interface Rec { active: boolean; by: string }
interface Signal {
  t: "verse" | "verse-clear" | "prayer-start" | "prayer-stop" | "hand" | "rec";
  ref?: string; text?: string; by?: string;
  topic?: string; endsAt?: number;
  id?: string; name?: string; raised?: boolean;
  active?: boolean;
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

  const [isMobile, setIsMobile] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [handRaised, setHandRaised] = useState(false);
  const [hands, setHands] = useState<Record<string, string>>({});
  const [verse, setVerse] = useState<Verse | null>(null);
  const [prayer, setPrayer] = useState<Prayer | null>(null);
  const [showVersePrompt, setShowVersePrompt] = useState(false);
  const [showPrayerPrompt, setShowPrayerPrompt] = useState(false);

  const room = useRoomContext();
  const [canModerate, setCanModerate] = useState(false);
  const [recording, setRecording] = useState<Rec | null>(null);
  const recEgressRef = useRef<string | null>(null);
  const [toast, setToast] = useState("");

  // Notes (persistées dans un ref pour survivre à l'ouverture/fermeture du panneau)
  const notesRef = useRef("");
  // Stats (mises à jour par interval dans des refs → ne re-render PAS la grille)
  const statsRef = useRef<MeetStats>({ start: Date.now(), peak: 1, shares: 0, talk: {} });
  const participantsRef = useRef(participants);
  participantsRef.current = participants;
  const screenActiveRef = useRef(false);
  const hasScreenRef = useRef(false);
  hasScreenRef.current = !!screenShare;

  const myId = localParticipant.identity;
  const myName = localParticipant.name || state.displayName || "Moi";

  // ── Chat (data channel LiveKit intégré) ──
  const { chatMessages, send: sendChat } = useChat();
  const [seenChat, setSeenChat] = useState(0);
  const unreadChat = panel === "chat" ? 0 : Math.max(0, chatMessages.length - seenChat);
  useEffect(() => { if (panel === "chat") setSeenChat(chatMessages.length); }, [panel, chatMessages.length]);

  // ── Signalisation CCB (verset / prière / main levée) ──
  const { send: sendSignal } = useDataChannel("ccb-signal", (msg) => {
    try {
      const d = JSON.parse(new TextDecoder().decode(msg.payload)) as Signal;
      if (d.t === "verse" && d.ref) setVerse({ ref: d.ref, text: d.text || "", by: d.by || "" });
      else if (d.t === "verse-clear") setVerse(null);
      else if (d.t === "prayer-start" && d.topic && d.endsAt) setPrayer({ topic: d.topic, endsAt: d.endsAt, by: d.by || "" });
      else if (d.t === "prayer-stop") setPrayer(null);
      else if (d.t === "hand" && d.id) {
        setHands((h) => {
          const n = { ...h };
          if (d.raised) n[d.id!] = d.name || "Participant";
          else delete n[d.id!];
          return n;
        });
      }
      else if (d.t === "rec") setRecording(d.active ? { active: true, by: d.by || "" } : null);
    } catch { /* noop */ }
  });
  function broadcast(obj: Signal) {
    try { sendSignal(new TextEncoder().encode(JSON.stringify(obj)), { reliable: true }); } catch { /* noop */ }
  }

  // Persistance des notes partagées (ref, sans re-render de la grille)
  useDataChannel("ccb-notes", (msg) => {
    try { notesRef.current = new TextDecoder().decode(msg.payload); } catch { /* noop */ }
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
        const role = (data as { role?: string } | null)?.role;
        if (!cancelled) setCanModerate(!!role && ["owner", "admin", "leader", "moderator"].includes(role));
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, []);
  // Statistiques : échantillonne chaque seconde dans des refs (aucun re-render)
  useEffect(() => {
    const t = setInterval(() => {
      const ps = participantsRef.current;
      const st = statsRef.current;
      if (ps.length > st.peak) st.peak = ps.length;
      for (const p of ps) {
        if (p.isSpeaking) {
          const cur = st.talk[p.identity] ?? { name: p.name || "Participant", secs: 0 };
          cur.secs += 1; cur.name = p.name || cur.name;
          st.talk[p.identity] = cur;
        }
      }
      if (screenActiveRef.current === false && hasScreenRef.current) st.shares += 1;
      screenActiveRef.current = hasScreenRef.current;
    }, 1000);
    return () => clearInterval(t);
  }, []);

  function handleLeave() {
    endCall();
    router.push(state.backUrl ?? "/community/groups");
  }
  function handleMinimize() { router.back(); }

  function toggleHand() {
    const raised = !handRaised;
    setHandRaised(raised);
    setHands((h) => {
      const n = { ...h };
      if (raised) n[myId] = myName; else delete n[myId];
      return n;
    });
    broadcast({ t: "hand", id: myId, name: myName, raised });
  }
  function shareVerse(ref: string, text: string) {
    const v = { ref, text, by: myName };
    setVerse(v);
    broadcast({ t: "verse", ref, text, by: myName });
  }
  function clearVerse() { setVerse(null); broadcast({ t: "verse-clear" }); }
  function startPrayer(topic: string, minutes: number) {
    const endsAt = Date.now() + minutes * 60_000;
    setPrayer({ topic, endsAt, by: myName });
    broadcast({ t: "prayer-start", topic, endsAt, by: myName });
  }
  function stopPrayer() { setPrayer(null); broadcast({ t: "prayer-stop" }); }

  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 3200); }

  async function moderate(targetIdentity: string, action: "mute-mic" | "mute-cam" | "remove") {
    if (action === "remove" && !confirm("Retirer ce participant de la réunion ?")) return;
    try {
      const res = await fetch("/api/livekit/moderate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: room.name, targetIdentity, action }),
      });
      const j = await res.json().catch(() => ({}));
      flash(res.ok ? "✅ Action effectuée" : "Erreur : " + (j.error || res.status));
    } catch { flash("Erreur réseau"); }
  }

  async function toggleRecording() {
    if (recording && recEgressRef.current) {
      try {
        await fetch("/api/livekit/record", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop", egressId: recEgressRef.current }),
        });
      } catch { /* noop */ }
      recEgressRef.current = null;
      setRecording(null);
      broadcast({ t: "rec", active: false });
      return;
    }
    if (recording) { flash("Enregistrement géré par " + (recording.by || "un autre admin")); return; }
    try {
      const res = await fetch("/api/livekit/record", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", roomName: room.name }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.egressId) {
        recEgressRef.current = j.egressId;
        setRecording({ active: true, by: myName });
        broadcast({ t: "rec", active: true, by: myName });
        flash("🔴 Enregistrement démarré");
      } else {
        flash(j.error || "Enregistrement indisponible");
      }
    } catch { flash("Erreur réseau"); }
  }

  const count = participants.length;
  const callName = state.groupName || "CCB Meet";
  const handsCount = Object.keys(hands).length;
  const isDmOneToOne =
    !!state.conversationId && !state.groupId && !isAudio && !screenShare && cameraTracks.length === 2;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#121212", display: "flex", flexDirection: "column", zIndex: 200, color: "#fff" }}>
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
            <CallTimer />
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.5)" }} />
            <span>👥 {count}</span>
            {handsCount > 0 && <><span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.5)" }} /><span>✋ {handsCount}</span></>}
          </div>
        </div>
        <div style={{ width: 38 }} />
      </div>

      {/* ── Bannières verset / prière / enregistrement ── */}
      <div style={{ position: "absolute", top: "calc(58px + env(safe-area-inset-top, 0px))", left: 0, right: 0, zIndex: 4, display: "flex", flexDirection: "column", gap: 8, padding: "0 12px", pointerEvents: "none" }}>
        {recording && <RecBanner by={recording.by} />}
        {verse && <VerseBanner verse={verse} canClear={verse.by === myName} onClear={clearVerse} />}
        {prayer && <PrayerBanner prayer={prayer} canStop={prayer.by === myName} onStop={stopPrayer} onEnd={() => setPrayer(null)} />}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "absolute", bottom: "calc(92px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", zIndex: 10, background: "rgba(0,0,0,0.86)", color: "#fff", padding: "9px 16px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, maxWidth: "92%", textAlign: "center", boxShadow: "0 6px 20px rgba(0,0,0,0.4)" }}>{toast}</div>
      )}

      {/* ── Zone principale ── */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {screenShare ? (
          <Presentation screen={screenShare} cams={cameraTracks} isMobile={isMobile} />
        ) : isDmOneToOne ? (
          <PipLayout cams={cameraTracks} localIdentity={myId} />
        ) : (
          <AdaptiveGrid tracks={cameraTracks} count={Math.max(count, cameraTracks.length)} isMobile={isMobile} />
        )}
      </div>

      {/* ── Panneaux latéraux ── */}
      {panel === "chat" && (
        <ChatPanel messages={chatMessages} onSend={(t) => sendChat(t)} onClose={() => setPanel("none")} myId={myId} />
      )}
      {panel === "people" && (
        <PeoplePanel participants={participants} hands={hands} myId={myId} isAudio={isAudio} canModerate={canModerate} onModerate={moderate} onClose={() => setPanel("none")} />
      )}
      {panel === "settings" && (
        <SettingsPanel room={room} isAudio={isAudio} onClose={() => setPanel("none")} />
      )}
      {panel === "notes" && (
        <NotesPanel notesRef={notesRef} onClose={() => setPanel("none")} />
      )}
      {panel === "stats" && (
        <StatsPanel statsRef={statsRef} onClose={() => setPanel("none")} />
      )}

      {/* ── Prompts ── */}
      {showVersePrompt && <VersePrompt onShare={(r, t) => { shareVerse(r, t); setShowVersePrompt(false); }} onClose={() => setShowVersePrompt(false)} />}
      {showPrayerPrompt && <PrayerPrompt onStart={(topic, m) => { startPrayer(topic, m); setShowPrayerPrompt(false); }} onClose={() => setShowPrayerPrompt(false)} />}

      {/* ── Barre de contrôle ── */}
      <ControlBar
        isAudio={isAudio}
        handRaised={handRaised}
        unreadChat={unreadChat}
        peopleCount={count}
        panel={panel}
        onHand={toggleHand}
        onChat={() => setPanel((p) => (p === "chat" ? "none" : "chat"))}
        onPeople={() => setPanel((p) => (p === "people" ? "none" : "people"))}
        onVerse={() => setShowVersePrompt(true)}
        onPrayer={() => (prayer ? stopPrayer() : setShowPrayerPrompt(true))}
        prayerActive={!!prayer}
        onSettings={() => setPanel((p) => (p === "settings" ? "none" : "settings"))}
        onNotes={() => setPanel((p) => (p === "notes" ? "none" : "notes"))}
        onStats={() => setPanel((p) => (p === "stats" ? "none" : "stats"))}
        canRecord={canModerate}
        recording={!!recording}
        onRecord={toggleRecording}
        onLeave={handleLeave}
      />
    </div>
  );
}

/* ─────────────── Minuteur isolé (évite de re-render la grille vidéo) ─────────────── */
function CallTimer() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtDuration(s)}</span>;
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

/* ─────────────── Mode présentation ─────────────── */
function Presentation({ screen, cams, isMobile }: { screen: TrackReferenceOrPlaceholder; cams: TrackReferenceOrPlaceholder[]; isMobile: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100%", gap: 6, padding: 6 }}>
      <div style={{ flex: 1, minHeight: 0, minWidth: 0, borderRadius: 14, overflow: "hidden", background: "#000", position: "relative" }}>
        <ParticipantTile trackRef={screen} />
        <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", color: GOLD, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>🖥️ Présentation</div>
      </div>
      <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", gap: 6, overflowX: isMobile ? "auto" : "visible", overflowY: isMobile ? "visible" : "auto", flexShrink: 0, width: isMobile ? "100%" : 168, maxHeight: isMobile ? 100 : "100%" }}>
        {cams.map((t, i) => (
          <div key={(t.participant?.identity ?? "c") + i} style={{ flexShrink: 0, width: isMobile ? 130 : "100%", aspectRatio: "1 / 1", borderRadius: 12, overflow: "hidden", background: CARD }}>
            <ParticipantTile trackRef={t} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── 1-1 vidéo : PiP déplaçable ─────────────── */
function PipLayout({ cams, localIdentity }: { cams: TrackReferenceOrPlaceholder[]; localIdentity: string }) {
  const remote = cams.find((t) => t.participant?.identity !== localIdentity) ?? cams[0];
  const local = cams.find((t) => t.participant?.identity === localIdentity) ?? cams[1];
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 16, y: 96 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  function onDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const nx = Math.min(Math.max(8, e.clientX - drag.current.dx), window.innerWidth - 124);
    const ny = Math.min(Math.max(70, e.clientY - drag.current.dy), window.innerHeight - 200);
    setPos({ x: nx, y: ny });
  }
  function onUp() { drag.current = null; }

  return (
    <div style={{ height: "100%", width: "100%", position: "relative", background: "#000" }}>
      {remote && <ParticipantTile trackRef={remote} />}
      {local && (
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          style={{ position: "absolute", left: pos.x, top: pos.y, width: 112, aspectRatio: "3 / 4", borderRadius: 14, overflow: "hidden", border: `2px solid ${GOLD}`, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", cursor: "grab", touchAction: "none", zIndex: 4, background: CARD }}>
          <ParticipantTile trackRef={local} />
        </div>
      )}
    </div>
  );
}

/* ─────────────── Bannières ─────────────── */
function VerseBanner({ verse, canClear, onClear }: { verse: Verse; canClear: boolean; onClear: () => void }) {
  return (
    <div style={{ pointerEvents: "auto", maxWidth: 560, margin: "0 auto", width: "100%", background: "rgba(30,30,30,0.96)", border: `1px solid ${GOLD}55`, borderLeft: `3px solid ${GOLD}`, borderRadius: 12, padding: "10px 13px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", animation: "ccb-banner-in .3s ease both" }}>
      <style>{`@keyframes ccb-banner-in{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:none;}}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ color: GOLD, fontWeight: 800, fontSize: 12.5 }}>📖 {verse.ref}</span>
        {canClear && <button onClick={onClear} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 14 }}>✕</button>}
      </div>
      {verse.text && <div style={{ fontSize: 13.5, color: "#fff", lineHeight: 1.5, marginTop: 4, fontStyle: "italic" }}>« {verse.text} »</div>}
      {verse.by && <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>partagé par {verse.by}</div>}
    </div>
  );
}
function PrayerBanner({ prayer, canStop, onStop, onEnd }: { prayer: Prayer; canStop: boolean; onStop: () => void; onEnd: () => void }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.round((prayer.endsAt - Date.now()) / 1000)));
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  useEffect(() => {
    const t = setInterval(() => {
      const r = Math.max(0, Math.round((prayer.endsAt - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) { clearInterval(t); setTimeout(() => onEndRef.current(), 2500); }
    }, 1000);
    return () => clearInterval(t);
  }, [prayer.endsAt]);
  return (
    <div style={{ pointerEvents: "auto", maxWidth: 560, margin: "0 auto", width: "100%", background: `linear-gradient(135deg, ${VIOLET}, #3E1C70)`, border: `1px solid ${GOLD}55`, borderRadius: 12, padding: "10px 13px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: GOLD, fontWeight: 800, letterSpacing: "0.08em" }}>🙏 MODE PRIÈRE</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prayer.topic}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 17, color: "#fff" }}>{fmtDuration(remaining)}</span>
          {canStop && <button onClick={onStop} style={{ background: "rgba(0,0,0,0.3)", border: "none", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 10px" }}>Arrêter</button>}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Panneau Chat ─────────────── */
type ChatMsg = ReturnType<typeof useChat>["chatMessages"][number];
function ChatPanel({ messages, onSend, onClose }: { messages: ChatMsg[]; onSend: (t: string) => void; onClose: () => void; myId: string }) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  function submit() { const t = text.trim(); if (!t) return; onSend(t); setText(""); }
  return (
    <SidePanel title="💬 Discussion" onClose={onClose}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px" }}>
        {messages.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", marginTop: 24 }}>Aucun message. Écris le premier 🙂</div>
        ) : messages.map((m, i) => (
          <div key={m.id ?? i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "8px 11px" }}>
            <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 2 }}>{m.from?.name || m.from?.identity || "Participant"}</div>
            <div style={{ fontSize: 13.5, color: "#fff", lineHeight: 1.45, wordBreak: "break-word" }}>{m.message}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder="Message…"
          style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "9px 14px", color: "#fff", fontSize: 13.5, outline: "none" }} />
        <button onClick={submit} style={{ background: VIOLET, border: "none", borderRadius: 999, width: 42, height: 42, color: "#fff", fontSize: 17, cursor: "pointer", flexShrink: 0 }}>➤</button>
      </div>
    </SidePanel>
  );
}

/* ─────────────── Panneau Participants (+ modération) ─────────────── */
function PeoplePanel({ participants, hands, myId, isAudio, canModerate, onModerate, onClose }: {
  participants: ReturnType<typeof useParticipants>; hands: Record<string, string>; myId: string;
  isAudio: boolean; canModerate: boolean; onModerate: (id: string, a: "mute-mic" | "mute-cam" | "remove") => void; onClose: () => void;
}) {
  const sorted = useMemo(() => {
    return [...participants].sort((a, b) => {
      const ah = hands[a.identity] ? 1 : 0, bh = hands[b.identity] ? 1 : 0;
      return bh - ah;
    });
  }, [participants, hands]);
  return (
    <SidePanel title={`👥 Participants · ${participants.length}`} onClose={onClose}>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        {sorted.map((p) => {
          const raised = !!hands[p.identity];
          const me = p.identity === myId;
          const showMod = canModerate && !me;
          return (
            <div key={p.identity} style={{ padding: "9px 10px", borderRadius: 10, background: raised ? "rgba(212,175,55,0.10)" : "transparent" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${VIOLET}, #3E1C70)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff" }}>
                  {initialsOf(p.name || p.identity)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name || "Participant"}{me ? " (vous)" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, fontSize: 15 }}>
                  {raised && <span title="Main levée">✋</span>}
                  {p.isSpeaking && <span title="Parle" style={{ width: 8, height: 8, borderRadius: "50%", background: "#1FA855" }} />}
                  <span title={p.isMicrophoneEnabled ? "Micro actif" : "Micro coupé"} style={{ opacity: p.isMicrophoneEnabled ? 1 : 0.4 }}>{p.isMicrophoneEnabled ? "🎙️" : "🔇"}</span>
                  {!isAudio && <span title={p.isCameraEnabled ? "Caméra active" : "Caméra coupée"} style={{ opacity: p.isCameraEnabled ? 1 : 0.4 }}>{p.isCameraEnabled ? "📹" : "📷"}</span>}
                </div>
              </div>
              {showMod && (
                <div style={{ display: "flex", gap: 6, marginTop: 7, paddingLeft: 49 }}>
                  <ModBtn label="🔇 Couper micro" onClick={() => onModerate(p.identity, "mute-mic")} />
                  {!isAudio && <ModBtn label="📷 Couper caméra" onClick={() => onModerate(p.identity, "mute-cam")} />}
                  <ModBtn danger label="🚫 Retirer" onClick={() => onModerate(p.identity, "remove")} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SidePanel>
  );
}
function ModBtn({ label, danger, onClick }: { label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: danger ? "rgba(220,38,38,0.18)" : "rgba(255,255,255,0.08)", border: `1px solid ${danger ? "rgba(220,38,38,0.5)" : "rgba(255,255,255,0.14)"}`, color: danger ? "#FCA5A5" : "rgba(255,255,255,0.85)", borderRadius: 8, padding: "5px 9px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
  );
}

/* ─────────────── Bannière enregistrement ─────────────── */
function RecBanner({ by }: { by: string }) {
  return (
    <div style={{ pointerEvents: "auto", maxWidth: 560, margin: "0 auto", width: "100%", background: "rgba(220,38,38,0.92)", borderRadius: 12, padding: "8px 13px", display: "flex", alignItems: "center", gap: 9, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#fff", animation: "ccb-rec-blink 1.1s ease-in-out infinite" }} />
      <style>{`@keyframes ccb-rec-blink{0%,100%{opacity:1;}50%{opacity:.25;}}`}</style>
      <span style={{ fontWeight: 800, fontSize: 12.5, color: "#fff", letterSpacing: "0.06em" }}>REC · Enregistrement en cours{by ? ` · ${by}` : ""}</span>
    </div>
  );
}

/* ─────────────── Panneau Paramètres (périphériques) ─────────────── */
function SettingsPanel({ room, isAudio, onClose }: { room: Room; isAudio: boolean; onClose: () => void }) {
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [spks, setSpks] = useState<MediaDeviceInfo[]>([]);
  const [sel, setSel] = useState<{ mic?: string; cam?: string; spk?: string }>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        setMics(devices.filter((d) => d.kind === "audioinput"));
        setCams(devices.filter((d) => d.kind === "videoinput"));
        setSpks(devices.filter((d) => d.kind === "audiooutput"));
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, []);
  async function change(kind: MediaDeviceKind, deviceId: string) {
    try {
      await room.switchActiveDevice(kind, deviceId);
      setSel((s) => ({ ...s, [kind === "audioinput" ? "mic" : kind === "videoinput" ? "cam" : "spk"]: deviceId }));
    } catch { /* noop */ }
  }

  // ── Arrière-plans / flou (chargé dynamiquement, isolé) ──
  const [bg, setBg] = useState("none");
  const [bgBusy, setBgBusy] = useState(false);
  const [bgMsg, setBgMsg] = useState("");
  async function applyBg(kind: string) {
    if (bgBusy) return;
    setBgBusy(true); setBgMsg("");
    try {
      const cam = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
      if (!(cam instanceof LocalVideoTrack)) { setBgMsg("Active d'abord ta caméra."); setBgBusy(false); return; }
      if (kind === "none") {
        await cam.stopProcessor();
      } else {
        const mod = await import("@livekit/track-processors");
        const proc = kind === "blur"
          ? mod.BackgroundBlur(12)
          : mod.VirtualBackground(window.location.origin + kind);
        await cam.setProcessor(proc);
      }
      setBg(kind);
    } catch {
      setBgMsg("Effet indisponible sur cet appareil/navigateur.");
    }
    setBgBusy(false);
  }

  return (
    <SidePanel title="⚙️ Paramètres" onClose={onClose}>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 16 }}>
        {!isAudio && (
          <div>
            <div style={{ fontSize: 12, color: GOLD, fontWeight: 700, marginBottom: 8 }}>🌄 Arrière-plan</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {BACKGROUNDS.map((b) => {
                const active = bg === b.key;
                return (
                  <button key={b.key} onClick={() => applyBg(b.key)} disabled={bgBusy} style={{
                    position: "relative", aspectRatio: "16 / 10", borderRadius: 10, overflow: "hidden", cursor: bgBusy ? "wait" : "pointer",
                    border: `2px solid ${active ? GOLD : "rgba(255,255,255,0.14)"}`, padding: 0,
                    background: b.img ? `center/cover no-repeat url(${b.img})` : "rgba(255,255,255,0.07)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {!b.img && <span style={{ fontSize: 20 }}>{b.emoji}</span>}
                    <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "2px 0", textAlign: "center" }}>{b.label}</span>
                  </button>
                );
              })}
            </div>
            {bgMsg && <div style={{ fontSize: 11.5, color: "#FCA5A5", marginTop: 6 }}>{bgMsg}</div>}
          </div>
        )}
        <DeviceSelect label="🎙️ Microphone" devices={mics} value={sel.mic} onChange={(id) => change("audioinput", id)} />
        {!isAudio && <DeviceSelect label="📹 Caméra" devices={cams} value={sel.cam} onChange={(id) => change("videoinput", id)} />}
        {spks.length > 0 && <DeviceSelect label="🔊 Haut-parleur" devices={spks} value={sel.spk} onChange={(id) => change("audiooutput", id)} />}
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>Le flou/arrière-plan nécessite un appareil compatible. Le choix du haut-parleur n&apos;est pas pris en charge par tous les navigateurs.</div>
      </div>
    </SidePanel>
  );
}
const BACKGROUNDS: { key: string; label: string; emoji?: string; img?: string }[] = [
  { key: "none", label: "Aucun", emoji: "🚫" },
  { key: "blur", label: "Flou", emoji: "🌫️" },
  { key: "/meet-bg/ccb.jpg", label: "CCB", img: "/meet-bg/ccb.jpg" },
  { key: "/meet-bg/croix.jpg", label: "Croix", img: "/meet-bg/croix.jpg" },
  { key: "/meet-bg/ciel.jpg", label: "Ciel", img: "/meet-bg/ciel.jpg" },
  { key: "/meet-bg/vitrail.jpg", label: "Vitrail", img: "/meet-bg/vitrail.jpg" },
];
function DeviceSelect({ label, devices, value, onChange }: { label: string; devices: MediaDeviceInfo[]; value?: string; onChange: (id: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: GOLD, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none" }}>
        {devices.length === 0 && <option value="">Aucun périphérique détecté</option>}
        {devices.map((d, i) => <option key={d.deviceId || i} value={d.deviceId} style={{ color: "#000" }}>{d.label || `Périphérique ${i + 1}`}</option>)}
      </select>
    </div>
  );
}

/* ─────────────── Coquille de panneau latéral ─────────────── */
function SidePanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "min(380px, 100vw)", zIndex: 7, background: CARD, borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(0,0,0,0.4)", animation: "ccb-panel-in .25s ease both" }}>
      <style>{`@keyframes ccb-panel-in{from{transform:translateX(20px);opacity:0;}to{transform:none;opacity:1;}}`}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(12px + env(safe-area-inset-top,0px)) 14px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>{title}</span>
        <button onClick={onClose} aria-label="Fermer" style={{ ...iconBtn, width: 34, height: 34, fontSize: 16 }}>✕</button>
      </div>
      {children}
    </div>
  );
}

/* ─────────────── Prompts (verset / prière) ─────────────── */
function VersePrompt({ onShare, onClose }: { onShare: (ref: string, text: string) => void; onClose: () => void }) {
  const [ref, setRef] = useState("");
  const [text, setText] = useState("");
  return (
    <PromptShell title="📖 Partager un verset" onClose={onClose}>
      <input autoFocus value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Référence — ex : Jean 3:16" style={promptInput} />
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Texte du verset (optionnel)" rows={3} style={{ ...promptInput, resize: "none" }} />
      <button disabled={!ref.trim()} onClick={() => onShare(ref.trim(), text.trim())} style={{ ...promptBtn, opacity: ref.trim() ? 1 : 0.5 }}>Partager à tous</button>
    </PromptShell>
  );
}
function PrayerPrompt({ onStart, onClose }: { onStart: (topic: string, minutes: number) => void; onClose: () => void }) {
  const [topic, setTopic] = useState("");
  const [minutes, setMinutes] = useState(5);
  return (
    <PromptShell title="🙏 Démarrer un temps de prière" onClose={onClose}>
      <input autoFocus value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Sujet — ex : Nos familles" style={promptInput} />
      <div style={{ display: "flex", gap: 8 }}>
        {[3, 5, 10, 15].map((m) => (
          <button key={m} onClick={() => setMinutes(m)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${minutes === m ? GOLD : "rgba(255,255,255,0.15)"}`, background: minutes === m ? "rgba(212,175,55,0.15)" : "transparent", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{m} min</button>
        ))}
      </div>
      <button disabled={!topic.trim()} onClick={() => onStart(topic.trim(), minutes)} style={{ ...promptBtn, opacity: topic.trim() ? 1 : 0.5 }}>Lancer la prière</button>
    </PromptShell>
  );
}
function PromptShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "absolute", inset: 0, zIndex: 9, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ width: "100%", maxWidth: 420, background: CARD, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>{title}</span>
          <button onClick={onClose} aria-label="Fermer" style={{ ...iconBtn, width: 32, height: 32, fontSize: 15 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─────────────── Panneau Notes (collaboratives + export) ─────────────── */
function NotesPanel({ notesRef, onClose }: { notesRef: React.MutableRefObject<string>; onClose: () => void }) {
  const [text, setText] = useState(notesRef.current);
  const focusedRef = useRef(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { send } = useDataChannel("ccb-notes", (msg) => {
    if (focusedRef.current) return;
    try { const v = new TextDecoder().decode(msg.payload); setText(v); notesRef.current = v; } catch { /* noop */ }
  });
  function onChange(v: string) {
    setText(v); notesRef.current = v;
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { try { send(new TextEncoder().encode(v), { reliable: true }); } catch { /* noop */ } }, 250);
  }
  function exportWord() {
    const html = `<html><head><meta charset="utf-8"></head><body style="font-family:Arial"><h2 style="color:#5A2CA0">Notes de réunion — CCB Meet</h2><div style="color:#666;font-size:12px">${new Date().toLocaleString("fr-FR")}</div><hr/><pre style="font-family:Arial;white-space:pre-wrap;font-size:13px">${escapeHtml(text)}</pre></body></html>`;
    downloadBlob(new Blob([html], { type: "application/msword" }), `ccb-notes-${Date.now()}.doc`);
  }
  function exportPdf() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><meta charset="utf-8"><title>Notes CCB Meet</title></head><body style="font-family:Arial;padding:24px"><h2 style="color:#5A2CA0">Notes de réunion — CCB Meet</h2><div style="color:#666;font-size:12px">${new Date().toLocaleString("fr-FR")}</div><hr/><pre style="font-family:Arial;white-space:pre-wrap;font-size:13px;line-height:1.5">${escapeHtml(text)}</pre></body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch { /* noop */ } }, 350);
  }
  return (
    <SidePanel title="📝 Notes de réunion" onClose={onClose}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 12, gap: 10, minHeight: 0 }}>
        <textarea value={text}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; }}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Notes partagées — tout le monde peut écrire…"
          style={{ flex: 1, minHeight: 0, resize: "none", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12, color: "#fff", fontSize: 13.5, lineHeight: 1.5, outline: "none", fontFamily: "inherit" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportPdf} style={exportBtn}>📄 Exporter PDF</button>
          <button onClick={exportWord} style={exportBtn}>📝 Exporter Word</button>
        </div>
      </div>
    </SidePanel>
  );
}

/* ─────────────── Panneau Statistiques ─────────────── */
function StatsPanel({ statsRef, onClose }: { statsRef: React.MutableRefObject<MeetStats>; onClose: () => void }) {
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const s = statsRef.current;
  const duration = Math.max(0, Math.round((Date.now() - s.start) / 1000));
  const talkers = Object.values(s.talk).sort((a, b) => b.secs - a.secs).slice(0, 12);
  const maxSecs = talkers[0]?.secs || 1;
  return (
    <SidePanel title="📊 Statistiques" onClose={onClose}>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <StatBox label="Durée" value={fmtDuration(duration)} />
          <StatBox label="Pic participants" value={String(s.peak)} />
          <StatBox label="Partages d'écran" value={String(s.shares)} />
          <StatBox label="Intervenants" value={String(Object.keys(s.talk).length)} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: GOLD, fontWeight: 700, marginBottom: 8 }}>🎙️ Temps de parole</div>
          {talkers.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>Aucune prise de parole détectée pour l&apos;instant.</div>
          ) : talkers.map((t, i) => (
            <div key={i} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                <span style={{ color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontVariantNumeric: "tabular-nums" }}>{fmtDuration(t.secs)}</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round((t.secs / maxSecs) * 100)}%`, background: `linear-gradient(90deg, ${VIOLET}, ${GOLD})`, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SidePanel>
  );
}
function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "11px 12px" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ─────────────── Barre de contrôle ─────────────── */
function ControlBar({
  isAudio, handRaised, unreadChat, panel, prayerActive,
  onHand, onChat, onPeople, onVerse, onPrayer, onSettings, onNotes, onStats,
  canRecord, recording, onRecord, onLeave,
}: {
  isAudio: boolean; handRaised: boolean; unreadChat: number; peopleCount: number; panel: Panel; prayerActive: boolean;
  onHand: () => void; onChat: () => void; onPeople: () => void; onVerse: () => void; onPrayer: () => void; onSettings: () => void;
  onNotes: () => void; onStats: () => void;
  canRecord: boolean; recording: boolean; onRecord: () => void; onLeave: () => void;
}) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 6, display: "flex", justifyContent: "center", padding: "12px 10px", paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))", background: "linear-gradient(0deg, rgba(0,0,0,0.72), transparent)" }}>
      <div className="ccb-meet-controls" style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(30,30,30,0.92)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "9px 12px", backdropFilter: "blur(14px)", boxShadow: "0 10px 30px rgba(0,0,0,0.4)", maxWidth: "100%", overflowX: "auto" }}>
        <style>{`.ccb-meet-controls::-webkit-scrollbar{display:none;}`}</style>
        <TrackToggle source={Track.Source.Microphone} showIcon style={ctrlBtn(false)}><span style={{ fontSize: 19 }}>🎙️</span></TrackToggle>
        {!isAudio && <TrackToggle source={Track.Source.Camera} showIcon style={ctrlBtn(false)}><span style={{ fontSize: 19 }}>📹</span></TrackToggle>}
        {!isAudio && <TrackToggle source={Track.Source.ScreenShare} showIcon style={ctrlBtn(false)}><span style={{ fontSize: 19 }}>🖥️</span></TrackToggle>}
        <FeatureBtn emoji="✋" active={handRaised} onClick={onHand} />
        <FeatureBtn emoji="💬" active={panel === "chat"} badge={unreadChat} onClick={onChat} />
        <FeatureBtn emoji="👥" active={panel === "people"} onClick={onPeople} />
        <FeatureBtn emoji="📖" onClick={onVerse} />
        <FeatureBtn emoji="🙏" active={prayerActive} onClick={onPrayer} />
        <FeatureBtn emoji="📝" active={panel === "notes"} onClick={onNotes} />
        <FeatureBtn emoji="📊" active={panel === "stats"} onClick={onStats} />
        <FeatureBtn emoji="⚙️" active={panel === "settings"} onClick={onSettings} />
        {canRecord && (
          <button onClick={onRecord} title={recording ? "Arrêter l'enregistrement" : "Enregistrer"} style={{ ...ctrlBtn(false), background: recording ? "#DC2626" : "rgba(255,255,255,0.10)" }}>
            <span style={{ fontSize: 18 }}>{recording ? "⏹️" : "🔴"}</span>
          </button>
        )}
        <DisconnectButton onClick={onLeave} style={{ ...ctrlBtn(true), width: 60 }}><span style={{ fontSize: 19 }}>📞</span></DisconnectButton>
      </div>
    </div>
  );
}
function FeatureBtn({ emoji, active, badge, onClick }: { emoji: string; active?: boolean; badge?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ ...ctrlBtn(false), position: "relative", background: active ? VIOLET : "rgba(255,255,255,0.10)" }}>
      <span style={{ fontSize: 19 }}>{emoji}</span>
      {!!badge && badge > 0 && (
        <span style={{ position: "absolute", top: -2, right: -2, background: "#DC2626", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #1E1E1E" }}>{badge > 9 ? "9+" : badge}</span>
      )}
    </button>
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
    width: 50, height: 50, borderRadius: 999, border: "none", cursor: "pointer", flexShrink: 0,
    color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: danger ? "#DC2626" : "rgba(255,255,255,0.10)",
    boxShadow: danger ? "0 4px 14px rgba(220,38,38,0.5)" : "none",
  };
}
const promptInput: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "11px 13px",
  color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit",
};
const promptBtn: React.CSSProperties = {
  width: "100%", background: VIOLET, color: "#fff", border: "none", borderRadius: 12,
  padding: "12px", fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 2,
};
const exportBtn: React.CSSProperties = {
  flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
  color: "#fff", borderRadius: 10, padding: "9px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
};
