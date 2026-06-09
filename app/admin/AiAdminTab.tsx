"use client";

import { useEffect, useState } from "react";

const card: React.CSSProperties = { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem" };

const SOURCE_LABELS: Record<string, string> = {
  devotion: "Méditons ensemble", prayer: "Prions ensemble", jdtv: "JESUS DAILY TV",
  lesson: "Institut Berakah", media: "Bibliothèque", testimony: "Témoignages", event: "Événements",
};

export default function AiAdminTab() {
  const [count, setCount] = useState<number | null>(null);
  const [ready, setReady] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [bySource, setBySource] = useState<Record<string, number> | null>(null);

  const loadCount = async () => {
    try {
      const res = await fetch("/api/admin/ai-knowledge/reindex");
      const b = await res.json();
      setReady(!!b.ready);
      setCount(b.count ?? 0);
    } catch { setReady(false); }
  };
  useEffect(() => { loadCount(); }, []);

  const reindex = async () => {
    setLoading(true); setMsg(null); setBySource(null);
    try {
      const res = await fetch("/api/admin/ai-knowledge/reindex", { method: "POST" });
      const b = await res.json();
      if (!res.ok) setMsg("❌ " + (b.error || "Erreur"));
      else {
        setBySource(b.bySource || {});
        setMsg(`✅ ${b.total} document(s) indexé(s)${b.errors?.length ? ` · ${b.errors.length} source(s) ignorée(s)` : ""}.`);
        loadCount();
      }
    } catch { setMsg("❌ Réseau indisponible"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 760 }}>
      <div style={card}>
        <h3 style={{ margin: "0 0 .4rem", fontSize: "1.05rem" }}>🤖 BERAKAH AI — Base documentaire (RAG)</h3>
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem", lineHeight: 1.65, margin: "0 0 1.1rem" }}>
          BERAKAH AI s&apos;appuie <strong>en priorité</strong> sur les contenus CCB indexés ici (Méditons, Prions, JESUS DAILY,
          Institut, Bibliothèque, Témoignages, Événements) avant de compléter avec la Bible. L&apos;index se rafraîchit
          automatiquement chaque jour ; tu peux aussi le forcer maintenant.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--violet, #7c3aed)", lineHeight: 1 }}>{count ?? "—"}</div>
          <div style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>document(s) indexé(s)</div>
          <button onClick={reindex} disabled={loading}
            style={{ marginLeft: "auto", padding: ".6rem 1.2rem", borderRadius: "9999px", border: "none", background: "var(--gold)", color: "#1a0a00", fontWeight: 700, fontSize: ".85rem", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Indexation…" : "↻ Réindexer maintenant"}
          </button>
        </div>
        {!ready && (
          <div style={{ marginTop: ".9rem", padding: ".7rem .9rem", borderRadius: 10, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", color: "#d97706", fontSize: ".82rem" }}>
            ⚠️ Exécute la migration <strong>ai_knowledge_v63.sql</strong> dans Supabase pour activer la base.
          </div>
        )}
        {msg && <div style={{ marginTop: ".9rem", fontSize: ".85rem", color: "var(--text-secondary)" }}>{msg}</div>}
        {bySource && Object.keys(bySource).length > 0 && (
          <div style={{ marginTop: ".8rem", display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
            {Object.entries(bySource).map(([s, n]) => (
              <span key={s} style={{ fontSize: ".72rem", padding: ".2rem .6rem", borderRadius: "9999px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                {SOURCE_LABELS[s] || s} : <strong style={{ color: "var(--text-primary)" }}>{n}</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...card, fontSize: ".82rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
        💡 Le bouton flottant 🤖 est disponible partout dans l&apos;app. L&apos;IA tourne sur des modèles <strong>gratuits</strong> (OpenRouter).
        Pense à définir <code>OPENROUTER_API_KEY</code> dans Vercel pour l&apos;activer pleinement.
      </div>
    </div>
  );
}
