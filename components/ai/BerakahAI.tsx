"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 🤖 BERAKAH AI — bouton flottant + chat pastoral, disponible sur toute l'app.
 * Voix (reconnaissance navigateur), lecture audio (Web Speech), actions RDV /
 * accompagnement humain pour les situations sensibles. Couleurs CCB.
 */

interface Msg { role: "user" | "assistant"; content: string; sensitive?: boolean; appointment?: boolean }

const SUGGESTIONS = [
  { emoji: "📖", label: "Explique un verset", prompt: "Explique-moi le sens de Jean 3:16 et comment l'appliquer aujourd'hui." },
  { emoji: "🙏", label: "Compose une prière", prompt: "Compose une courte prière pour confier ma journée au Seigneur." },
  { emoji: "🌱", label: "Nouveau converti", prompt: "Je viens de donner ma vie à Christ. Par où commencer ma marche avec Dieu ?" },
  { emoji: "💡", label: "Que dit la Bible sur…", prompt: "Que dit la Bible sur l'inquiétude et l'anxiété ?" },
];

export default function BerakahAI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } }, []);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/compagnon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json().catch(() => ({ reply: "Erreur de connexion. 🙏" }));
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "…", sensitive: !!data.sensitive, appointment: !!data.appointment }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Erreur de connexion à BERAKAH AI. Réessaie. 🙏" }]);
    } finally {
      setLoading(false);
    }
  }

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("La reconnaissance vocale n'est pas disponible sur ce navigateur. Essaie Chrome 🙏"); return; }
    if (listening) { try { recRef.current?.stop(); } catch { /* noop */ } setListening(false); return; }
    try {
      const rec = new SR();
      rec.lang = "fr-FR"; rec.interimResults = true; rec.continuous = false;
      rec.onresult = (e: any) => {
        let t = "";
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
        setInput(t);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
      setListening(true);
      rec.start();
    } catch { setListening(false); }
  }

  function speak(text: string, idx: number) {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      if (speakingIdx === idx) { synth.cancel(); setSpeakingIdx(null); return; }
      synth.cancel();
      const clean = text.replace(/[#*_>`~]/g, "").replace(/\s+/g, " ").trim();
      const u = new SpeechSynthesisUtterance(clean);
      const looksEnglish = /\b(the|and|you|your|god|jesus|lord|prayer)\b/i.test(text) && !/[éèêàçùâ]/i.test(text);
      u.lang = looksEnglish ? "en-US" : "fr-FR";
      u.rate = 1; u.pitch = 1;
      u.onend = () => setSpeakingIdx(null);
      u.onerror = () => setSpeakingIdx(null);
      setSpeakingIdx(idx);
      synth.speak(u);
    } catch { setSpeakingIdx(null); }
  }

  function goRdv() {
    setOpen(false);
    router.push("/rendez-vous");
  }

  const empty = messages.length === 0;

  return (
    <>
      {!open && (
        <button className="berakah-fab" onClick={() => setOpen(true)} aria-label="Ouvrir BERAKAH AI" title="BERAKAH AI — assistant pastoral 24h/24">
          <span style={{ fontSize: 26, lineHeight: 1 }}>🤖</span>
        </button>
      )}

      {open && (
        <div className="berakah-panel" role="dialog" aria-label="BERAKAH AI">
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", background: "linear-gradient(135deg, var(--violet) 0%, var(--violet-dark) 100%)", color: "#fff", flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0 }}>🤖</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-title)", fontWeight: 800, fontSize: 15.5, lineHeight: 1.1 }}>BERAKAH AI</div>
              <div style={{ fontSize: 11, opacity: 0.85, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                Assistant pastoral · 24h/24
              </div>
            </div>
            {!empty && (
              <button onClick={() => { setMessages([]); try { window.speechSynthesis?.cancel(); } catch { /* noop */ } setSpeakingIdx(null); }} aria-label="Nouvelle conversation" title="Nouvelle conversation"
                style={{ background: "rgba(255,255,255,0.16)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 9, cursor: "pointer", fontSize: 15 }}>✚</button>
            )}
            <button onClick={() => setOpen(false)} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.16)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 9, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "12px 12px 4px", background: "var(--page-bg)" }}>
            {empty ? (
              <div style={{ textAlign: "center", padding: "8px 4px" }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>🕊️</div>
                <div style={{ fontSize: 14.5, color: "var(--text-primary)", fontWeight: 700, marginBottom: 3 }}>Que la grâce soit avec toi 👋</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14 }}>Comment puis-je t&apos;accompagner aujourd&apos;hui ?</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {SUGGESTIONS.map((s) => (
                    <button key={s.label} onClick={() => send(s.prompt)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", cursor: "pointer", textAlign: "left", color: "var(--text-primary)", fontSize: 13 }}>
                      <span style={{ fontSize: 18 }}>{s.emoji}</span>
                      <span style={{ fontWeight: 600 }}>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {messages.map((m, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "88%", whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 13.5, padding: "9px 13px", borderRadius: 15, background: m.role === "user" ? "var(--violet)" : "var(--card-bg)", color: m.role === "user" ? "#fff" : "var(--text-primary)", border: m.role === "user" ? "none" : "1px solid var(--border)", borderBottomRightRadius: m.role === "user" ? 5 : 15, borderBottomLeftRadius: m.role === "user" ? 15 : 5 }}>
                        {m.content}
                        {m.role === "assistant" && (
                          <button onClick={() => speak(m.content, i)} aria-label="Lire la réponse" title={speakingIdx === i ? "Arrêter" : "Écouter"}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 7, background: "var(--surface-2, #f0ece3)", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 8, padding: "3px 9px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                            {speakingIdx === i ? "⏹ Stop" : "🔊 Écouter"}
                          </button>
                        )}
                      </div>
                    </div>
                    {m.role === "assistant" && (m.sensitive || m.appointment) && (
                      <div style={{ marginTop: 8, background: m.sensitive ? "rgba(239,68,68,0.07)" : "var(--violet-50, #f5f3ff)", border: `1px solid ${m.sensitive ? "rgba(239,68,68,0.25)" : "var(--violet-pale, #ede9fe)"}`, borderRadius: 13, padding: "11px 13px" }}>
                        {m.sensitive && <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 9, lineHeight: 1.5 }}>💛 Cette situation mérite un accompagnement humain. Tu n&apos;es pas seul(e).</div>}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={goRdv} style={{ background: "var(--violet)", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>📅 Prendre rendez-vous</button>
                          <button onClick={goRdv} style={{ background: "var(--card-bg)", color: "var(--violet)", border: "1px solid var(--violet-pale, #ede9fe)", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>📩 Demande pastorale</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={{ padding: "10px 14px", borderRadius: 15, background: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12.5 }}>
                      <span className="berakah-typing">BERAKAH AI réfléchit…</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Composer */}
          <div style={{ flexShrink: 0, padding: "8px 10px calc(8px + env(safe-area-inset-bottom, 0px))", background: "var(--page-bg)", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 15, padding: 5 }}>
              <button onClick={toggleVoice} aria-label="Parler" title="Parler à BERAKAH AI"
                style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 11, border: "none", background: listening ? "var(--violet)" : "var(--surface-2, #f0ece3)", color: listening ? "#fff" : "var(--text-muted)", cursor: "pointer", fontSize: 17 }}>🎙️</button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder={listening ? "Parle maintenant…" : "Écris ta question, un besoin de prière…"}
                rows={1}
                style={{ flex: 1, resize: "none", border: "none", outline: "none", background: "transparent", color: "var(--text-primary)", fontSize: 13.5, fontFamily: "var(--font-body)", padding: "8px 6px", maxHeight: 110, lineHeight: 1.4 }}
              />
              <button onClick={() => send(input)} disabled={loading || !input.trim()} aria-label="Envoyer"
                style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 11, border: "none", background: input.trim() && !loading ? "var(--violet)" : "var(--surface-2, #f0ece3)", color: input.trim() && !loading ? "#fff" : "var(--text-muted)", cursor: input.trim() && !loading ? "pointer" : "default", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center" }}>➤</button>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", marginTop: 5 }}>
              BERAKAH AI peut se tromper et ne remplace pas le pasteur.
            </div>
          </div>
        </div>
      )}

      <style>{`
        .berakah-fab {
          position: fixed; right: 18px; bottom: 22px; z-index: 130;
          width: 58px; height: 58px; border-radius: 50%; border: none; cursor: pointer;
          background: linear-gradient(135deg, var(--violet) 0%, var(--violet-dark) 100%);
          box-shadow: 0 10px 28px rgba(91,33,182,0.42); color: #fff;
          display: flex; align-items: center; justify-content: center;
          animation: berakah-pop .35s ease both;
        }
        .berakah-fab:hover { transform: translateY(-2px); }
        .berakah-panel {
          position: fixed; right: 18px; bottom: 18px; z-index: 135;
          width: 396px; height: min(640px, 82vh);
          display: flex; flex-direction: column; overflow: hidden;
          background: var(--page-bg); border: 1px solid var(--border);
          border-radius: 20px; box-shadow: 0 24px 60px rgba(0,0,0,0.28);
          animation: berakah-pop .25s ease both;
        }
        @media (max-width: 640px) {
          .berakah-fab { right: 14px; bottom: calc(74px + env(safe-area-inset-bottom, 0px)); }
          .berakah-panel { right: 0; left: 0; top: 0; bottom: 0; width: auto; height: auto; border-radius: 0; border: none; }
        }
        @keyframes berakah-pop { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes berakah-blink { 0%,100%{opacity:.35} 50%{opacity:1} }
        .berakah-typing { animation: berakah-blink 1.2s ease-in-out infinite; }
      `}</style>
    </>
  );
}
