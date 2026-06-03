"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import type { MemberPick } from "./page";

export default function NewGroupClient({ members }: { members: MemberPick[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => (m.display_name || "").toLowerCase().includes(q));
  }, [members, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function create() {
    if (creating) return;
    if (selected.size < 1) { setError("Sélectionne au moins un membre."); return; }
    setCreating(true);
    setError(null);
    try {
      const sb = createClient();
      const { data, error: err } = await sb.rpc("create_group_conversation", {
        p_title: title.trim() || "Groupe privé",
        p_members: [...selected],
      });
      if (err || typeof data !== "string") {
        setError("Erreur : " + (err?.message ?? "création impossible"));
        setCreating(false);
        return;
      }
      router.push(`/community/messages/${data}`);
    } catch (e) {
      setError("Erreur : " + (e as Error).message);
      setCreating(false);
    }
  }

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body, paddingBottom: 90 }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff", padding: "16px 14px", display: "flex", alignItems: "center", gap: 10,
        boxShadow: T.shadowGlow,
      }}>
        <Link href="/community/messages" aria-label="Retour" style={{
          width: 34, height: 34, borderRadius: 999, background: "rgba(0,0,0,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", textDecoration: "none", fontSize: 17,
        }}>←</Link>
        <h1 style={{ fontFamily: F.title, fontSize: 19, fontWeight: 700, margin: 0 }}>
          👥 Nouveau groupe
        </h1>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px" }}>
        {error && (
          <div style={{ background: "rgba(194,75,122,0.1)", border: "1px solid rgba(194,75,122,0.3)", borderRadius: 10, padding: "8px 12px", color: "#C24B7A", fontSize: 12.5, marginBottom: 12 }}>
            ⚠ {error}
          </div>
        )}

        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
          placeholder="Nom du groupe (optionnel)"
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", marginBottom: 10,
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontSize: 14, fontFamily: F.body, outline: "none" }} />

        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher un membre…"
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", marginBottom: 12,
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 999, color: T.text, fontSize: 13, fontFamily: F.body, outline: "none" }} />

        {selected.size > 0 && (
          <div style={{ fontSize: 12.5, color: T.violet, fontWeight: 700, marginBottom: 10 }}>
            {selected.size} membre{selected.size > 1 ? "s" : ""} sélectionné{selected.size > 1 ? "s" : ""}
          </div>
        )}

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "30px 14px", textAlign: "center", color: T.textMuted, fontSize: 13 }}>Aucun membre trouvé.</div>
          ) : filtered.map((m, i) => {
            const checked = selected.has(m.user_id);
            const initials = (m.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <button key={m.user_id} onClick={() => toggle(m.user_id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "11px 14px", background: checked ? T.violetSoft : "transparent",
                border: "none", borderTop: i === 0 ? "none" : `1px solid ${T.borderSoft}`,
                cursor: "pointer", textAlign: "left", fontFamily: F.body,
              }}>
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar_url} alt={m.display_name || ""} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>{initials}</div>
                )}
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: T.text }}>{m.display_name || "Membre"}</span>
                <span style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${checked ? T.violet : T.border}`,
                  background: checked ? T.violet : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13,
                }}>{checked ? "✓" : ""}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barre flottante créer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", background: T.card, borderTop: `1px solid ${T.border}`, zIndex: 20 }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <button onClick={create} disabled={creating || selected.size === 0} style={{
            width: "100%", background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
            color: "#fff", border: "none", borderRadius: 999, padding: "13px",
            fontWeight: 800, fontSize: 14, cursor: creating || selected.size === 0 ? "not-allowed" : "pointer",
            opacity: selected.size === 0 ? 0.5 : 1, fontFamily: F.body,
          }}>
            {creating ? "Création…" : `Créer le groupe${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
