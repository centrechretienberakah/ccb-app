"use client";

import { useState } from "react";

const card: React.CSSProperties = { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const labelStyle: React.CSSProperties = { display: "block", color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" };
const btnPrimary: React.CSSProperties = { padding: "0.65rem 1.25rem", borderRadius: "9999px", border: "none", background: "var(--gold)", color: "#1a0a00", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" };

interface Props {
  /** Pré-remplit le formulaire — utile depuis "after-create-event" hook */
  prefill?: { title?: string; body?: string; url?: string };
  /** Callback après envoi réussi */
  onSent?: (result: { sent: number; failed: number }) => void;
}

export default function BroadcastNotification({ prefill, onSent }: Props) {
  const [title, setTitle] = useState(prefill?.title || "");
  const [body, setBody] = useState(prefill?.body || "");
  const [url, setUrl] = useState(prefill?.url || "/dashboard");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      setResult({ type: "error", text: "Titre et corps requis." });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || "/dashboard" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ type: "error", text: data.error || `Erreur ${res.status}` });
        setSending(false);
        return;
      }
      const sent = data.sent ?? 0;
      const failed = data.failed ?? 0;
      setResult({
        type: "success",
        text: sent === 0
          ? "Aucun membre abonné aux notifications push."
          : `✅ Envoyé à ${sent} appareil${sent > 1 ? "s" : ""}${failed > 0 ? ` (${failed} échec${failed > 1 ? "s" : ""})` : ""}.`,
      });
      onSent?.({ sent, failed });
      if (sent > 0) {
        setTitle("");
        setBody("");
      }
    } catch (e) {
      setResult({ type: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div>
        <h3 style={{ margin: "0 0 0.3rem", fontSize: "1.05rem" }}>📲 Diffuser une notification push</h3>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem" }}>
          Envoie une notification à tous les membres qui ont activé les push dans Paramètres.
        </p>
      </div>

      {result && (
        <div style={{ padding: "0.65rem 0.9rem", borderRadius: "var(--radius-md)", background: result.type === "success" ? "rgba(34,197,94,0.15)" : "rgba(248,113,113,0.15)", color: result.type === "success" ? "#86efac" : "#fca5a5", fontSize: "0.85rem" }}>
          {result.text}
        </div>
      )}

      <div>
        <label style={labelStyle}>Titre *</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : 🎓 Bootcamp CCB 2026 — Inscriptions ouvertes" maxLength={80} style={inputStyle} />
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{title.length}/80</span>
      </div>
      <div>
        <label style={labelStyle}>Message *</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Court message qui apparaîtra sous le titre" maxLength={200} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{body.length}/200</span>
      </div>
      <div>
        <label style={labelStyle}>URL au clic (optionnel)</label>
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/events" style={inputStyle} />
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Page ouverte quand le membre clique la notification. Par défaut /dashboard.</span>
      </div>

      <button onClick={send} disabled={sending} style={{ ...btnPrimary, opacity: sending ? 0.6 : 1, alignSelf: "flex-start" }}>
        {sending ? "Envoi..." : "📤 Envoyer maintenant"}
      </button>
    </div>
  );
}
