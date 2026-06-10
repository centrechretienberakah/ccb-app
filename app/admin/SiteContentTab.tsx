"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SiteContentRow {
  id: string;
  page_key: string;
  title: string | null;
  body_md: string | null;
  data_json: unknown;
  updated_at: string;
}

const card: React.CSSProperties = { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const labelStyle: React.CSSProperties = { display: "block", color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" };

const PAGES: { key: string; label: string; icon: string; hint?: string }[] = [
  { key: "a-propos",    label: "À propos",    icon: "⛪", hint: "Titre + intro de la page À propos (le reste = sections dédiées)" },
  { key: "confession-foi", label: "Profession de foi", icon: "✝️", hint: "Confession de foi du CCB. Édite le champ « Contenu (markdown) » : ### pour un article, --- pour séparer, **gras**. Laisse vide pour revenir au texte par défaut." },
  { key: "dons",        label: "Faire un don", icon: "💝", hint: "Présentation des moyens de soutien" },
  { key: "jesus-daily", label: "Jesus Daily TV", icon: "📺", hint: "Description de la rubrique vidéos" },
  { key: "nous-suivre", label: "Nous suivre",  icon: "📡", hint: "Liens vers réseaux sociaux (JSON: { links: [{ platform, url, label }] })" },
];

export default function SiteContentTab({ initialRows }: { initialRows: Record<string, unknown>[] }) {
  const rows = initialRows as unknown as SiteContentRow[];
  const byKey: Record<string, SiteContentRow | undefined> = {};
  for (const r of rows) byKey[r.page_key] = r;

  const [selectedKey, setSelectedKey] = useState(PAGES[0].key);
  const current = byKey[selectedKey];
  const [title, setTitle] = useState(current?.title ?? "");
  const [body, setBody] = useState(current?.body_md ?? "");
  const [json, setJson] = useState(current?.data_json ? JSON.stringify(current.data_json, null, 2) : "{}");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const switchTo = (key: string) => {
    const r = byKey[key];
    setSelectedKey(key);
    setTitle(r?.title ?? "");
    setBody(r?.body_md ?? "");
    setJson(r?.data_json ? JSON.stringify(r.data_json, null, 2) : "{}");
    setMsg(null);
  };

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    let parsedJson: unknown = {};
    try { parsedJson = JSON.parse(json || "{}"); }
    catch { setSaving(false); setMsg({ type: "error", text: "JSON invalide" }); return; }

    const sb = createClient();
    const { error } = await sb.from("site_content").upsert(
      {
        page_key: selectedKey,
        title: title || null,
        body_md: body || null,
        data_json: parsedJson,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "page_key" }
    );
    setSaving(false);
    if (error) { setMsg({ type: "error", text: error.message }); return; }
    setMsg({ type: "success", text: "Page enregistrée ✓" });
    setTimeout(() => setMsg(null), 3000);
  };

  const pageMeta = PAGES.find(p => p.key === selectedKey)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ ...card, display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {PAGES.map(p => (
          <button key={p.key} onClick={() => switchTo(p.key)} style={{
            padding: "0.5rem 0.9rem", borderRadius: "9999px",
            border: "1px solid " + (selectedKey === p.key ? "var(--gold)" : "var(--border)"),
            background: selectedKey === p.key ? "rgba(212,175,55,0.15)" : "transparent",
            color: selectedKey === p.key ? "var(--gold)" : "var(--text-primary)",
            fontSize: "0.85rem", cursor: "pointer", fontWeight: selectedKey === p.key ? 700 : 500,
          }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      <div style={{ ...card, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div>
          <h3 style={{ margin: "0 0 0.25rem" }}>{pageMeta.icon} {pageMeta.label}</h3>
          {pageMeta.hint && <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem" }}>{pageMeta.hint}</p>}
        </div>

        {msg && (
          <div style={{ padding: "0.6rem 0.9rem", borderRadius: "var(--radius-md)", background: msg.type === "success" ? "rgba(34,197,94,0.15)" : "rgba(248,113,113,0.15)", color: msg.type === "success" ? "#86efac" : "#fca5a5", fontSize: "0.85rem" }}>{msg.text}</div>
        )}

        <div>
          <label style={labelStyle}>Titre</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Contenu (markdown)</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} style={{ ...inputStyle, minHeight: 220, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.82rem" }} />
        </div>
        <div>
          <label style={labelStyle}>Données structurées (JSON)</label>
          <textarea value={json} onChange={e => setJson(e.target.value)} style={{ ...inputStyle, minHeight: 140, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.82rem" }} />
        </div>

        <button onClick={handleSave} disabled={saving} style={{ padding: "0.7rem 1.3rem", borderRadius: "9999px", border: "none", background: "var(--gold)", color: "#1a0a00", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", opacity: saving ? 0.6 : 1, alignSelf: "flex-start" }}>
          {saving ? "..." : "💾 Enregistrer"}
        </button>
      </div>
    </div>
  );
}
