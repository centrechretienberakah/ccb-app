"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Group { id: string; name: string; description?: string; type?: string; member_count?: number; is_private?: boolean; cover_url?: string; created_at: string; }

const TYPE_COLORS: Record<string, { color: string; bg: string; border: string; emoji: string }> = {
  prayer: { color: "#818cf8", bg: "rgba(129,140,248,0.1)", border: "rgba(129,140,248,0.3)", emoji: "🙏" },
  study: { color: "#34d399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.3)", emoji: "📖" },
  mentoring: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", emoji: "👨‍🏫" },
  youth: { color: "#f472b6", bg: "rgba(244,114,182,0.1)", border: "rgba(244,114,182,0.3)", emoji: "🌟" },
  women: { color: "#ec4899", bg: "rgba(236,72,153,0.1)", border: "rgba(236,72,153,0.3)", emoji: "🌸" },
  men: { color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.3)", emoji: "💪" },
  default: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", emoji: "👥" },
};

function getStyle(type?: string) { return TYPE_COLORS[type ?? "default"] ?? TYPE_COLORS.default; }

export default function GroupesClient({ groups, myGroupIds: initial, userId }: { groups: Group[]; myGroupIds: string[]; userId: string | null }) {
  const [myIds, setMyIds] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  const join = async (groupId: string) => {
    if (!userId) return alert("Connectez-vous pour rejoindre un groupe");
    setLoading(groupId);
    const sb = createClient();
    await sb.from("group_members").insert({ group_id: groupId, user_id: userId, role: "member" });
    setMyIds([...myIds, groupId]);
    setLoading(null);
  };

  const leave = async (groupId: string) => {
    if (!userId) return;
    setLoading(groupId);
    const sb = createClient();
    await sb.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
    setMyIds(myIds.filter(id => id !== groupId));
    setLoading(null);
  };

  const mine = groups.filter(g => myIds.includes(g.id));
  const others = groups.filter(g => !myIds.includes(g.id));

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 80px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px" }}>🤝 Groupes</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>Cellules, mentorat et communautés de croissance spirituelle</p>
      </div>

      {mine.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>✅ Mes groupes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mine.map(g => { const s = getStyle(g.type); return (
              <div key={g.id} style={{ display: "flex", gap: 14, alignItems: "center", background: s.bg, border: `1px solid ${s.border}`, borderRadius: "var(--radius-xl)", padding: "16px 20px" }}>
                <div style={{ width: 48, height: 48, borderRadius: "var(--radius-lg)", background: s.bg, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{s.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{g.name}</div>
                  {g.description && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{g.description}</div>}
                  <div style={{ fontSize: 12, color: s.color, marginTop: 4 }}>👥 {g.member_count ?? 0} membres {g.is_private ? "· 🔒 Privé" : ""}</div>
                </div>
                <button onClick={() => leave(g.id)} disabled={loading === g.id}
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-full)", padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Quitter
                </button>
              </div>
            );})}
          </div>
        </div>
      )}

      {others.length === 0 && mine.length === 0 ? (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
          <p style={{ color: "var(--text-muted)", fontSize: 15, margin: 0 }}>Aucun groupe disponible pour le moment.<br/>Contactez-nous pour rejoindre une cellule de croissance.</p>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Tous les groupes</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {others.map(g => { const s = getStyle(g.type); return (
              <div key={g.id} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "var(--radius-lg)", background: s.bg, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: s.color }}>👥 {g.member_count ?? 0} membres {g.is_private ? "· 🔒" : ""}</div>
                  </div>
                </div>
                {g.description && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>{g.description}</p>}
                <button onClick={() => join(g.id)} disabled={loading === g.id || !userId}
                  style={{ background: s.color, color: "#fff", border: "none", borderRadius: "var(--radius-full)", padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: userId ? "pointer" : "default", opacity: userId ? 1 : 0.5 }}>
                  {loading === g.id ? "..." : g.is_private ? "🔒 Demander" : "Rejoindre →"}
                </button>
              </div>
            );})}
          </div>
        </div>
      )}
    </div>
  );
}
