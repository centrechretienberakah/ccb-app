"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Temoignage { id: string; content: string; user_id: string; created_at: string; likes_count: number; category?: string; }

const CATEGORIES = ["Guérison", "Délivrance", "Protection", "Provision", "Famille", "Travail", "Autre"];

function fmtDate(d: string) { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); }

export default function TemoignagesClient({ temoignages, userId }: { temoignages: Temoignage[]; userId: string | null }) {
  const [list, setList] = useState(temoignages);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Guérison");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const submit = async () => {
    if (!content.trim() || !userId) return;
    setLoading(true);
    const sb = createClient();
    const { data } = await sb.from("posts").insert({ content: content.trim(), category: "temoignage", user_id: userId }).select().single();
    if (data) { setList([data as Temoignage, ...list]); setContent(""); setSuccess(true); setShowForm(false); setTimeout(() => setSuccess(false), 3000); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>✨</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, background: "linear-gradient(135deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 6px" }}>
          Espace Témoignages
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>Gloire à Dieu ! Partagez ce qu&apos;il a accompli dans votre vie</p>
      </div>

      {success && (
        <div style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.4)", borderRadius: "var(--radius-xl)", padding: "14px 20px", marginBottom: 20, textAlign: "center", color: "#34d399", fontWeight: 700 }}>
          🙏 Gloire à Dieu ! Votre témoignage a été partagé.
        </div>
      )}

      {/* Partager */}
      {userId && !showForm && (
        <button onClick={() => setShowForm(true)}
          style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "14px 20px", cursor: "pointer", marginBottom: 24, color: "var(--text-muted)", fontSize: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✨</div>
          Partagez votre témoignage à la gloire de Dieu...
        </button>
      )}

      {showForm && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "20px", marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>✨ Votre témoignage</h3>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 14 }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                style={{ flexShrink: 0, background: category === c ? "#f59e0b" : "var(--page-bg)", color: category === c ? "#000" : "var(--text-muted)", border: `1px solid ${category === c ? "#f59e0b" : "var(--border)"}`, borderRadius: "var(--radius-full)", padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {c}
              </button>
            ))}
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Racontez ce que Dieu a accompli dans votre vie... (guérison, délivrance, provision, protection...)" rows={5}
            style={{ width: "100%", background: "var(--page-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px", color: "var(--text-primary)", fontSize: 14, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.6, outline: "none" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, background: "var(--page-bg)", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: "var(--radius-full)", padding: "10px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Annuler</button>
            <button onClick={submit} disabled={!content.trim() || loading}
              style={{ flex: 2, background: content.trim() ? "#f59e0b" : "var(--page-bg)", color: content.trim() ? "#000" : "var(--text-muted)", border: "none", borderRadius: "var(--radius-full)", padding: "10px", fontWeight: 700, fontSize: 14, cursor: content.trim() ? "pointer" : "default" }}>
              {loading ? "Publication..." : "🙌 Gloire à Dieu — Partager"}
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {list.length === 0 ? (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
          <p style={{ color: "var(--text-muted)", fontSize: 15, margin: 0 }}>Soyez le premier à partager votre témoignage !</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {list.map(t => (
            <div key={t.id} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "18px 20px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✨</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>Membre CCB</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmtDate(t.created_at)}</div>
                </div>
                {t.category && <span style={{ marginLeft: "auto", background: "rgba(245,158,11,0.12)", color: "#f59e0b", borderRadius: "var(--radius-full)", padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{t.category}</span>}
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, margin: "0 0 10px", fontStyle: "italic" }}>&ldquo;{t.content}&rdquo;</p>
              <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 12 }}>
                <span>🙏 {t.likes_count || 0} Gloire à Dieu !</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
