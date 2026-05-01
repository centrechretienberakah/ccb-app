"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Devotion {
  id: string;
  devotion_date: string;
  title: string;
  verse_reference: string;
  verse_text: string;
  meditation_p1: string;
  meditation_p2: string;
  meditation_p3?: string;
  reflection_question?: string;
  prayer: string;
  declaration: string;
}

interface Member {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  spiritual_level?: string;
  created_at: string;
}

interface Stats {
  totalMembers: number;
  totalDevotions: number;
  todayReads: number;
  totalReads: number;
}

interface AdminClientProps {
  devotions: Devotion[];
  members: Member[];
  stats: Stats;
}

const C = {
  bg: "#07040f",
  surface: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  gold: "#d4af37",
  goldDark: "#b8941f",
  violet: "#7c3aed",
  violetDark: "#3d1a72",
  green: "#22c55e",
  red: "#ef4444",
  text: "rgba(255,255,255,0.9)",
  textMuted: "rgba(255,255,255,0.45)",
};

export default function AdminClient({ devotions: initialDevotions, members, stats }: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "devotions" | "members" | "new-devotion">("overview");
  const [devotions, setDevotions] = useState(initialDevotions);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New devotion form state
  const [form, setForm] = useState({
    devotion_date: new Date().toISOString().split("T")[0],
    title: "",
    verse_reference: "",
    verse_text: "",
    meditation_p1: "",
    meditation_p2: "",
    meditation_p3: "",
    reflection_question: "",
    prayer: "",
    declaration: "",
  });

  const handleSaveDevotion = async () => {
    if (!form.title || !form.verse_reference || !form.verse_text || !form.meditation_p1 || !form.meditation_p2 || !form.prayer || !form.declaration) {
      setMessage({ type: "error", text: "Tous les champs obligatoires doivent être remplis." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("daily_devotions")
      .insert({
        devotion_date: form.devotion_date,
        title: form.title,
        verse_reference: form.verse_reference,
        verse_text: form.verse_text,
        meditation_p1: form.meditation_p1,
        meditation_p2: form.meditation_p2,
        meditation_p3: form.meditation_p3 || null,
        reflection_question: form.reflection_question || null,
        prayer: form.prayer,
        declaration: form.declaration,
        author: "Admin CCB",
      });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: `✅ Dévotion du ${form.devotion_date} enregistrée !` });
      setDevotions(prev => [...prev, { id: Date.now().toString(), ...form }]);
      setForm({ devotion_date: "", title: "", verse_reference: "", verse_text: "", meditation_p1: "", meditation_p2: "", meditation_p3: "", reflection_question: "", prayer: "", declaration: "" });
      setActiveTab("devotions");
    }
    setSaving(false);
  };

  const tabs = [
    { id: "overview", label: "📊 Aperçu" },
    { id: "devotions", label: "📖 Dévotions" },
    { id: "members", label: "👥 Membres" },
    { id: "new-devotion", label: "✦ Nouvelle dévotion" },
  ] as const;

  const inputStyle = {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "white",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    color: "rgba(255,255,255,0.6)",
    fontSize: "0.78rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: "0.4rem",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.violetDark}, ${C.violet})`, padding: "1.5rem 1.5rem 1rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", marginBottom: "0.2rem" }}>Centre Chrétien Berakah</p>
              <h1 style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: "1.4rem", color: "white", margin: 0, letterSpacing: "0.04em" }}>
                ✦ Dashboard Admin
              </h1>
            </div>
            <a href="/dashboard" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem", textDecoration: "none" }}>
              ← Tableau de bord
            </a>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "8px 8px 0 0",
                  border: "none",
                  background: activeTab === tab.id ? C.bg : "rgba(255,255,255,0.1)",
                  color: activeTab === tab.id ? C.gold : "rgba(255,255,255,0.7)",
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem" }}>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Membres inscrits", value: stats.totalMembers, icon: "👥", color: C.violet },
                { label: "Dévotions en base", value: stats.totalDevotions, icon: "📖", color: C.gold },
                { label: "Lectures aujourd'hui", value: stats.todayReads, icon: "☀️", color: C.green },
                { label: "Total lectures", value: stats.totalReads, icon: "✦", color: "#a78bfa" },
              ].map(stat => (
                <div key={stat.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "1.25rem" }}>
                  <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{stat.icon}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: "0.8rem", color: C.textMuted, marginTop: "0.3rem" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Recent devotions */}
            <h2 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMuted, marginBottom: "1rem" }}>
              Dévotions récentes
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {devotions.slice(-5).reverse().map(d => (
                <div key={d.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`, borderRadius: "8px", padding: "0.4rem 0.7rem", fontSize: "0.75rem", fontWeight: 700, color: C.violetDark, whiteSpace: "nowrap" }}>
                    {new Date(d.devotion_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "white" }}>{d.title}</div>
                    <div style={{ fontSize: "0.78rem", color: C.textMuted }}>{d.verse_reference}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DÉVOTIONS ── */}
        {activeTab === "devotions" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMuted, margin: 0 }}>
                {devotions.length} dévotion(s) en base
              </h2>
              <button
                onClick={() => setActiveTab("new-devotion")}
                style={{ padding: "0.55rem 1.25rem", borderRadius: "9999px", border: "none", background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`, color: C.violetDark, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
              >
                + Nouvelle dévotion
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[...devotions].reverse().map(d => (
                <div key={d.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                    <div style={{ background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`, borderRadius: "8px", padding: "0.4rem 0.7rem", fontSize: "0.75rem", fontWeight: 700, color: C.violetDark, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {new Date(d.devotion_date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "white", marginBottom: "0.2rem" }}>{d.title}</div>
                      <div style={{ fontSize: "0.8rem", color: C.gold, marginBottom: "0.4rem" }}>{d.verse_reference}</div>
                      <div style={{ fontSize: "0.78rem", color: C.textMuted, fontStyle: "italic" }}>&ldquo;{d.verse_text?.substring(0, 100)}{d.verse_text?.length > 100 ? "..." : ""}&rdquo;</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MEMBRES ── */}
        {activeTab === "members" && (
          <div>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMuted, marginBottom: "1.25rem" }}>
              {members.length} membre(s) inscrit(s)
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {members.map(m => (
                <div key={m.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: m.role === "admin" ? `linear-gradient(135deg, ${C.goldDark}, ${C.gold})` : `linear-gradient(135deg, ${C.violet}, #a78bfa)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1rem", color: "white", flexShrink: 0 }}>
                    {(m.full_name?.[0] || "?").toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "white" }}>{m.full_name || "Sans nom"}</div>
                    <div style={{ fontSize: "0.75rem", color: C.textMuted }}>{m.spiritual_level || "Nouveau croyant"}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "9999px", background: m.role === "admin" ? "rgba(212,175,55,0.15)" : "rgba(124,58,237,0.15)", color: m.role === "admin" ? C.gold : "#a78bfa" }}>
                      {m.role || "member"}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: C.textMuted }}>
                      {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <div style={{ textAlign: "center", color: C.textMuted, padding: "3rem", background: C.surface, borderRadius: "16px", border: `1px solid ${C.border}` }}>
                  Aucun membre inscrit pour l'instant.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── NOUVELLE DÉVOTION ── */}
        {activeTab === "new-devotion" && (
          <div style={{ maxWidth: "720px" }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMuted, marginBottom: "1.5rem" }}>
              Créer une nouvelle dévotion
            </h2>

            {message && (
              <div style={{ padding: "0.875rem 1rem", borderRadius: "10px", marginBottom: "1.25rem", background: message.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${message.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, color: message.type === "success" ? "#86efac" : "#fca5a5", fontSize: "0.88rem" }}>
                {message.text}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Date + Titre */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input type="date" value={form.devotion_date} onChange={e => setForm(f => ({ ...f, devotion_date: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Titre *</label>
                  <input type="text" placeholder="Ex: Marcher dans la foi" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              {/* Verset */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Référence *</label>
                  <input type="text" placeholder="Ex: Jean 3:16" value={form.verse_reference} onChange={e => setForm(f => ({ ...f, verse_reference: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Texte du verset *</label>
                  <input type="text" placeholder="Texte biblique complet" value={form.verse_text} onChange={e => setForm(f => ({ ...f, verse_text: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              {/* Méditations */}
              {(["meditation_p1", "meditation_p2", "meditation_p3"] as const).map((key, i) => (
                <div key={key}>
                  <label style={labelStyle}>Méditation {i + 1}{i < 2 ? " *" : " (optionnel)"}</label>
                  <textarea
                    placeholder={`Paragraphe ${i + 1} de la méditation...`}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }}
                  />
                </div>
              ))}

              {/* Question */}
              <div>
                <label style={labelStyle}>Question de réflexion (optionnel)</label>
                <input type="text" placeholder="Question pour la méditation personnelle" value={form.reflection_question} onChange={e => setForm(f => ({ ...f, reflection_question: e.target.value }))} style={inputStyle} />
              </div>

              {/* Prière */}
              <div>
                <label style={labelStyle}>Prière *</label>
                <textarea
                  placeholder="Prière du jour..."
                  value={form.prayer}
                  onChange={e => setForm(f => ({ ...f, prayer: e.target.value }))}
                  style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }}
                />
              </div>

              {/* Déclaration */}
              <div>
                <label style={labelStyle}>Déclaration de foi *</label>
                <input type="text" placeholder="Je déclare que..." value={form.declaration} onChange={e => setForm(f => ({ ...f, declaration: e.target.value }))} style={inputStyle} />
              </div>

              {/* Submit */}
              <button
                onClick={handleSaveDevotion}
                disabled={saving}
                style={{ padding: "1rem", borderRadius: "12px", border: "none", background: saving ? "rgba(212,175,55,0.3)" : `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`, color: C.violetDark, fontWeight: 800, fontSize: "1rem", cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.04em" }}
              >
                {saving ? "Enregistrement..." : "✦ Publier la dévotion"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
