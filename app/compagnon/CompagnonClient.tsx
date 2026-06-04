"use client";

import { useEffect, useRef, useState } from "react";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  { emoji: "📖", label: "Explique-moi un verset", prompt: "Explique-moi le sens de Jean 3:16 et comment l'appliquer aujourd'hui." },
  { emoji: "🙏", label: "Compose une prière", prompt: "Compose une courte prière du matin pour confier ma journée au Seigneur." },
  { emoji: "💬", label: "Pose une question biblique", prompt: "Que dit la Bible sur le pardon envers ceux qui nous ont blessés ?" },
  { emoji: "🕊️", label: "Méditation personnalisée", prompt: "Propose-moi une méditation de 3 minutes sur la paix de Dieu." },
  { emoji: "🌱", label: "Nouveau converti", prompt: "Je viens de donner ma vie à Christ. Par où commencer ma marche avec Dieu ?" },
];

export default function CompagnonClient({ firstName }: { firstName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/compagnon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({ reply: "Erreur de connexion. 🙏" }));
      if (data.configured === false) setNotConfigured(true);
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "…" }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Erreur de connexion à l'assistant. Réessaie. 🙏" }]);
    } finally {
      setLoading(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div style={{
      maxWidth: 820, margin: "0 auto", padding: "16px 14px 0",
      minHeight: "calc(100dvh - var(--ccb-topbar-h, 62px) - var(--ccb-bottomnav-h, 0px))",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-body)",
    }}>
      {/* En-tête */}
      <div style={{
        display: "flex", alignItems: "center", gap: 13,
        background: "linear-gradient(135deg, var(--violet) 0%, var(--violet-dark) 100%)",
        color: "#fff", borderRadius: 20, padding: "14px 16px", marginBottom: 14,
        boxShadow: "0 8px 24px rgba(91, 33, 182,0.25)",
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: 14, flexShrink: 0,
          background: "rgba(255,255,255,0.16)", display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 24,
        }}>✨</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-title)", fontWeight: 800, fontSize: 17, lineHeight: 1.15 }}>
            Compagnon Biblique IA
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 1 }}>
            Versets, prières & méditations — à tes côtés
          </div>
        </div>
      </div>

      {notConfigured && (
        <div style={{
          background: "rgba(212,175,55,0.14)", color: "var(--text-secondary)",
          border: "1px solid var(--border)", borderRadius: 12,
          padding: "9px 12px", fontSize: 12, marginBottom: 12, textAlign: "center",
        }}>
          ⏳ L'IA sera pleinement active dès qu'une clé d'API sera ajoutée par l'administrateur.
        </div>
      )}

      {/* Conversation */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {empty ? (
          <div style={{ textAlign: "center", padding: "10px 6px 4px" }}>
            <div style={{ fontSize: 15, color: "var(--text-primary)", fontWeight: 600, marginBottom: 4 }}>
              Bonjour {firstName} 👋
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
              Comment puis-je t&apos;accompagner dans la Parole aujourd&apos;hui ?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s.label} onClick={() => send(s.prompt)} style={{
                  display: "flex", alignItems: "center", gap: 11, width: "100%",
                  background: "var(--card-bg)", border: "1px solid var(--border)",
                  borderRadius: 14, padding: "12px 14px", cursor: "pointer",
                  textAlign: "left", color: "var(--text-primary)", fontFamily: "var(--font-body)",
                  fontSize: 13.5, transition: "border-color .15s, transform .15s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--violet-light)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
                >
                  <span style={{ fontSize: 20 }}>{s.emoji}</span>
                  <span style={{ fontWeight: 600 }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "86%", whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 14,
                  padding: "10px 14px", borderRadius: 16,
                  background: m.role === "user" ? "var(--violet)" : "var(--card-bg)",
                  color: m.role === "user" ? "#fff" : "var(--text-primary)",
                  border: m.role === "user" ? "none" : "1px solid var(--border)",
                  borderBottomRightRadius: m.role === "user" ? 5 : 16,
                  borderBottomLeftRadius: m.role === "user" ? 16 : 5,
                }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  padding: "12px 16px", borderRadius: 16, background: "var(--card-bg)",
                  border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13,
                }}>
                  <span className="ccb-typing">Le Compagnon réfléchit…</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composeur */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "var(--page-bg)", paddingTop: 8,
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
      }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 8,
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: 18, padding: 6, boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Écris ta question, un verset, un besoin de prière…"
            rows={1}
            style={{
              flex: 1, resize: "none", border: "none", outline: "none", background: "transparent",
              color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-body)",
              padding: "8px 10px", maxHeight: 120, lineHeight: 1.4,
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            aria-label="Envoyer"
            style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: 13, border: "none",
              background: input.trim() && !loading ? "var(--violet)" : "var(--surface-2)",
              color: input.trim() && !loading ? "#fff" : "var(--text-muted)",
              cursor: input.trim() && !loading ? "pointer" : "default",
              fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background .15s",
            }}
          >➤</button>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--text-muted)", textAlign: "center", marginTop: 6 }}>
          Le Compagnon peut se tromper — pour un accompagnement profond, contacte un pasteur du CCB.
        </div>
      </div>

      <style>{`
        @keyframes ccb-blink { 0%,100%{opacity:.35} 50%{opacity:1} }
        .ccb-typing { animation: ccb-blink 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
