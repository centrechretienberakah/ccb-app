"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRAYER_THEME as T, PRAYER_FONTS as F, getPrayerCategoryDef } from "@/lib/prayer/theme";

interface Report {
  id: string;
  prayer_id: string | null;
  comment_id: string | null;
  user_id: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  created_at: string;
}
interface PrayerLite {
  id: string; content: string; title: string | null;
  user_id: string; category: string | null; created_at: string;
}
interface CommentLite {
  id: string; content: string; prayer_id: string; user_id: string;
}
interface Profile {
  user_id: string; display_name: string | null; avatar_url: string | null;
}

interface Props {
  reports: Report[];
  prayers: PrayerLite[];
  comments: CommentLite[];
  profiles: Profile[];
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: "⏳ En attente",   color: "#D4AF37" },
  reviewed:  { label: "👁️ Revu",        color: "#D4AF37" },
  dismissed: { label: "❌ Rejeté",       color: "#857C95" },
  actioned:  { label: "✅ Action prise", color: "#2E9B47" },
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

export default function AdminPrayerClient({ reports: initialReports, prayers, comments, profiles }: Props) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [filter, setFilter] = useState<"all" | "pending" | "actioned" | "dismissed">("pending");
  const [toast, setToast] = useState<string | null>(null);

  const profileMap = useMemo(() => Object.fromEntries(profiles.map((p) => [p.user_id, p])), [profiles]);
  const prayerMap = useMemo(() => Object.fromEntries(prayers.map((p) => [p.id, p])), [prayers]);
  const commentMap = useMemo(() => Object.fromEntries(comments.map((c) => [c.id, c])), [comments]);

  const filtered = useMemo(
    () => reports.filter((r) => filter === "all" || r.status === filter),
    [reports, filter],
  );

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  async function updateStatus(reportId: string, status: Report["status"]) {
    const supabase = createClient();
    const { error } = await supabase
      .from("prayer_reports")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", reportId);
    if (error) { flash("Erreur : " + error.message); return; }
    setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status } : r));
    flash(`Statut → ${STATUS_LABEL[status].label}`);
  }

  async function deletePrayer(prayerId: string, reportId: string) {
    if (!confirm("Supprimer définitivement cette demande de prière ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("prayer_requests").delete().eq("id", prayerId);
    if (error) { flash("Erreur : " + error.message); return; }
    await updateStatus(reportId, "actioned");
    flash("Prière supprimée.");
  }

  async function deleteComment(commentId: string, reportId: string) {
    if (!confirm("Supprimer définitivement ce commentaire ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("prayer_comments").delete().eq("id", commentId);
    if (error) { flash("Erreur : " + error.message); return; }
    await updateStatus(reportId, "actioned");
    flash("Commentaire supprimé.");
  }

  return (
    <div style={{
      background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: F.body, paddingBottom: 60,
    }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: T.violet, color: "#fff", padding: "10px 20px",
          borderRadius: 999, fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: T.shadowMd,
        }}>{toast}</div>
      )}

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px 14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Link href="/prayer" style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 12px",
            color: T.gold, fontSize: 12, fontWeight: 700,
            textDecoration: "none",
          }}>← Prions ensemble</Link>
        </div>

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
          color: "#fff", borderRadius: 16, padding: "20px 22px",
          marginBottom: 18, position: "relative", overflow: "hidden",
          boxShadow: T.shadowMd,
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${T.gold}, transparent)`,
          }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 32 }}>🛡️</span>
            <div>
              <h1 style={{ fontFamily: F.title, fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>
                Modération Prions ensemble
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: "#EDE7FA", opacity: 0.9 }}>
                {reports.filter((r) => r.status === "pending").length} signalement(s) en attente
              </p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {(["pending", "actioned", "dismissed", "all"] as const).map((f) => {
            const def = f === "all" ? { label: "Tous", color: T.textMuted } : STATUS_LABEL[f];
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "6px 14px",
                background: filter === f ? `${def.color}1f` : T.card,
                border: `1px solid ${filter === f ? def.color : T.border}`,
                color: filter === f ? def.color : T.textMuted,
                fontSize: 12, fontWeight: filter === f ? 700 : 500,
                borderRadius: 999, cursor: "pointer", fontFamily: F.body,
              }}>
                {def.label}
              </button>
            );
          })}
        </div>

        {/* Reports */}
        {filtered.length === 0 ? (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "40px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🕊️</div>
            <div style={{ color: T.textMuted, fontSize: 14 }}>
              Aucun signalement dans cette catégorie.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((r) => {
              const reporter = profileMap[r.user_id];
              const prayer = r.prayer_id ? prayerMap[r.prayer_id] : null;
              const comment = r.comment_id ? commentMap[r.comment_id] : null;
              const author = prayer ? profileMap[prayer.user_id]
                : comment ? profileMap[comment.user_id]
                : null;
              const status = STATUS_LABEL[r.status];
              const cat = prayer ? getPrayerCategoryDef(prayer.category) : null;

              return (
                <div key={r.id} style={{
                  background: T.card,
                  border: `1px solid ${r.status === "pending" ? T.gold : T.border}`,
                  borderRadius: 14, padding: 16,
                  boxShadow: T.shadowSoft,
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    marginBottom: 10, flexWrap: "wrap",
                  }}>
                    <span style={{
                      background: `${status.color}1f`, color: status.color,
                      padding: "2px 10px", borderRadius: 999,
                      fontSize: 10, fontWeight: 700,
                    }}>
                      {status.label}
                    </span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>
                      Signalé par <strong>{reporter?.display_name || "Anonyme"}</strong> · {timeAgo(r.created_at)}
                    </span>
                  </div>

                  {/* Motif */}
                  <div style={{
                    background: T.surface2, borderRadius: 8,
                    padding: "8px 12px", marginBottom: 12,
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: T.textMuted,
                      textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3,
                    }}>
                      Motif
                    </div>
                    <div style={{ fontSize: 13, color: T.textSoft }}>{r.reason}</div>
                  </div>

                  {/* Contenu signalé */}
                  {prayer && (
                    <div style={{
                      background: T.surface2, borderLeft: `3px solid ${T.violet}`,
                      borderRadius: "0 10px 10px 0", padding: "10px 14px",
                      marginBottom: 12,
                    }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: T.gold,
                        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
                      }}>
                        🙏 Prière de {author?.display_name || "Membre"}
                        {cat && <span style={{ marginLeft: 6, color: cat.color }}>· {cat.emoji} {cat.label}</span>}
                      </div>
                      {prayer.title && (
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>
                          {prayer.title}
                        </div>
                      )}
                      <p style={{ margin: 0, fontSize: 13, color: T.textSoft, lineHeight: 1.55 }}>
                        {prayer.content}
                      </p>
                    </div>
                  )}
                  {comment && (
                    <div style={{
                      background: T.surface2, borderLeft: `3px solid ${T.violet}`,
                      borderRadius: "0 10px 10px 0", padding: "10px 14px",
                      marginBottom: 12,
                    }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: T.gold,
                        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
                      }}>
                        💬 Commentaire de {author?.display_name || "Membre"}
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: T.textSoft, lineHeight: 1.55 }}>
                        {comment.content}
                      </p>
                    </div>
                  )}
                  {!prayer && !comment && (
                    <div style={{
                      padding: "10px 14px", background: T.surface2, borderRadius: 8,
                      marginBottom: 12, fontSize: 12, color: T.textMuted, fontStyle: "italic",
                    }}>
                      Le contenu signalé a déjà été supprimé.
                    </div>
                  )}

                  {/* Actions */}
                  {r.status === "pending" && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => updateStatus(r.id, "reviewed")} style={btnGhost}>
                        👁️ Marquer vu
                      </button>
                      <button onClick={() => updateStatus(r.id, "dismissed")} style={btnGhost}>
                        ❌ Rejeter
                      </button>
                      {prayer && (
                        <button onClick={() => deletePrayer(prayer.id, r.id)} style={btnDanger}>
                          🗑 Supprimer la prière
                        </button>
                      )}
                      {comment && (
                        <button onClick={() => deleteComment(comment.id, r.id)} style={btnDanger}>
                          🗑 Supprimer le commentaire
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const btnGhost: React.CSSProperties = {
  background: T.card, color: T.textSoft, border: `1px solid ${T.border}`,
  borderRadius: 10, padding: "8px 14px",
  fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: F.body,
};
const btnDanger: React.CSSProperties = {
  background: "#C24B7A", color: "#fff", border: "none",
  borderRadius: 10, padding: "8px 14px",
  fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: F.body,
};
