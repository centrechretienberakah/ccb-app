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
  useChat,
  useDataChannel,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { useCall } from "@/lib/meet/CallContext";

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

type Panel = "none" | "chat" | "people";
interface Verse { ref: string; text: string; by: string }
interface Prayer { topic: string; endsAt: number; by: string }
interface Signal {
  t: "verse" | "verse-clear" | "prayer-start" | "prayer-stop" | "hand";
  ref?: string; text?: string; by?: string;
  topic?: string; endsAt?: number;
  id?: string; name?: string; raised?: boolean;
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
    } catch { /* noop */ }
  });
  function broadcast(obj: Signal) {
    try { sendSignal(new TextEncoder().encode(JSON.stringify(obj)), { reliable: true }); } catch { /* noop */ }
  }

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

      {/* ── Bannières verset / prière ── */}
      <div style={{ position: "absolute", top: "calc(58px + env(safe-area-inset-top, 0px))", left: 0, right: 0, zIndex: 4, display: "flex", flexDirection: "column", gap: 8, padding: "0 12px", pointerEvents: "none" }}>
        {verse && <VerseBanner verse={verse} canClear={verse.by === myName} onClear={clearVerse} />}
        {prayer && <PrayerBanner prayer={prayer} canStop={prayer.by === myName} onStop={stopPrayer} onEnd={() => setPrayer(null)} />}
      </div>

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
        <PeoplePanel participants={participants} hands={hands} myId={myId} isAudio={isAudio} onClose={() => setPanel("none")} />
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

/* ─────────────── Panneau Participants ─────────────── */
function PeoplePanel({ participants, hands, myId, isAudio, onClose }: { participants: ReturnType<typeof useParticipants>; hands: Record<string, string>; myId: string; isAudio: boolean; onClose: () => void }) {
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
          return (
            <div key={p.identity} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 10, background: raised ? "rgba(212,175,55,0.10)" : "transparent" }}>
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
          );
        })}
      </div>
    </SidePanel>
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

/* ─────────────── Barre de contrôle ─────────────── */
function ControlBar({
  isAudio, handRaised, unreadChat, panel, prayerActive,
  onHand, onChat, onPeople, onVerse, onPrayer, onLeave,
}: {
  isAudio: boolean; handRaised: boolean; unreadChat: number; peopleCount: number; panel: Panel; prayerActive: boolean;
  onHand: () => void; onChat: () => void; onPeople: () => void; onVerse: () => void; onPrayer: () => void; onLeave: () => void;
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
