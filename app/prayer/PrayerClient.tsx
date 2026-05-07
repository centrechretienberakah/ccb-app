"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────
interface PrayerReply {
  id: string;
  prayer_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_profiles?: { display_name: string; avatar_url?: string } | null;
}

interface Prayer {
  id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  is_answered: boolean;
  created_at: string;
  intercessionsCount: number;
  user_profiles?: { display_name: string; avatar_url?: string } | null;
  comments: PrayerReply[];
}

// ─── Utilitaires ──────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function Avatar({ profile, size = 36 }: {
  profile?: { display_name?: string; avatar_url?: string } | null;
  size?: number;
}) {
  const name = profile?.display_name || "?";
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} alt={name} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, var(--violet-dark), var(--violet-light))",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>{initials}</div>
  );
}

// ─── Section réponses ─────────────────────────────────────────
function ReplySection({ prayerId, replies, currentUserId, currentUserProfile, onReplyAdded, onReplyDeleted }: {
  prayerId: string;
  replies: PrayerReply[];
  currentUserId: string;
  currentUserProfile: any;
  onReplyAdded: (reply: PrayerReply) => void;
  onReplyDeleted: (replyId: string) => void;
}) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const remaining = 500 - content.length;

  async function submit() {
    if (content.trim().length < 2) return;
    setSaving(true); setError("");
    const supabase = createClient();
    const { data, error: e } = await supabase
      .from("prayer_comments")
      .insert({ prayer_id: prayerId, user_id: currentUserId, content: content.trim() })
      .select("id, prayer_id, user_id, content, created_at")
      .single();
    if (e) { setError(e.message); setSaving(false); return; }
    onReplyAdded({ ...data, user_profiles: currentUserProfile });
    setContent(""); setSaving(false);
  }

  async function deleteReply(replyId: string) {
    const supabase = createClient();
    await supabase.from("prayer_comments").delete().eq("id", replyId);
    onReplyDeleted(replyId);
  }

  return (
    <div style={{
      background: "var(--surface)", borderTop: "1px solid var(--border)",
      padding: "14px 16px",
    }}>
      {replies.length > 0 && (
        <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {replies.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Avatar profile={r.user_profiles} size={28} />
              <div style={{
                flex: 1, background: "var(--card-bg)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", padding: "8px 12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                    {r.user_profiles?.display_name || "Membre"}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{timeAgo(r.created_at)}</span>
                    {r.user_id === currentUserId && (
                      <button onClick={() => deleteReply(r.id)} style={{
                        background: "none", border: "none", color: "var(--text-muted)",
                        cursor: "pointer", fontSize: 11, padding: "1px 4px", lineHeight: 1,
                      }}>✕</button>
                    )}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {r.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Avatar profile={currentUserProfile} size={28} />
        <div style={{ flex: 1 }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); }}
            placeholder="Écrire une réponse de prière... (Ctrl+Entrée pour envoyer)"
            rows={2}
            style={{
              width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)",
              borderRadius: "var(--radius-md)", padding: "8px 12px",
              color: "var(--text-primary)", fontSize: 13, resize: "none",
              boxSizing: "border-box", fontFamily: "var(--font-body)", lineHeight: 1.5, outline: "none",
            }}
          />
          {error && <div style={{ color: "var(--error)", fontSize: 11, marginTop: 3 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
            <span style={{ fontSize: 10, color: remaining < 50 ? "var(--error)" : "var(--text-muted)" }}>
              {remaining} car. restants
            </span>
            <button onClick={submit} disabled={saving || content.trim().length < 2} style={{
              background: saving || content.trim().length < 2
                ? "var(--surface-2)"
                : "linear-gradient(135deg, var(--violet-dark), var(--violet-light))",
              border: "none", borderRadius: "var(--radius-sm)", padding: "6px 14px",
              color: saving || content.trim().length < 2 ? "var(--text-muted)" : "#fff",
              fontSize: 12, fontWeight: 700,
              cursor: saving || content.trim().length < 2 ? "not-allowed" : "pointer",
              fontFamily: "var(--font-body)",
            }}>
              {saving ? "..." : "Répondre 🙏"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Formulaire de soumission ─────────────────────────────────
function PrayerForm({ currentUserProfile, currentUserId, onSubmitted }: {
  currentUserProfile: any; currentUserId: string; onSubmitted: (prayer: Prayer) => void;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const remaining = 1000 - content.length;

  async function submit() {
    if (content.trim().length < 10) { setError("La requête doit faire au moins 10 caractères."); return; }
    setSaving(true); setError("");
    const supabase = createClient();
    const { data, error: e } = await supabase
      .from("prayer_requests")
      .insert({ user_id: currentUserId, content: content.trim(), is_anonymous: isAnonymous })
      .select("id, user_id, content, is_anonymous, is_answered, created_at")
      .single();
    if (e) { setError(e.message); setSaving(false); return; }
    onSubmitted({ ...data, intercessionsCount: 0, user_profiles: isAnonymous ? null : currentUserProfile, comments: [] });
    setContent(""); setIsAnonymous(false); setOpen(false); setSaving(false);
  }

  if (!open) {
    return (
      <div onClick={() => setOpen(true)} style={{
        background: "var(--card-bg)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", marginBottom: 20,
        boxShadow: "var(--shadow-sm)",
      }}>
        <Avatar profile={currentUserProfile} size={36} />
        <div style={{ flex: 1, color: "var(--text-muted)", fontSize: 14 }}>
          Partager une requête de prière avec la communauté...
        </div>
        <span style={{ fontSize: 20 }}>🙏</span>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--card-bg)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 20,
      boxShadow: "var(--shadow-md)",
    }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: "var(--violet-light)",
        marginBottom: 12, display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 18 }}>🙏</span> Nouvelle requête de prière
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Partagez votre besoin de prière... La communauté intercède pour vous."
        rows={4}
        style={{
          width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)",
          borderRadius: "var(--radius-md)", padding: "10px 14px",
          color: "var(--text-primary)", fontSize: 14, resize: "vertical",
          boxSizing: "border-box", fontFamily: "var(--font-body)", lineHeight: 1.6, outline: "none",
        }}
      />
      <div style={{ fontSize: 11, color: remaining < 50 ? "var(--error)" : "var(--text-muted)", textAlign: "right", marginTop: 4 }}>
        {remaining} caractères restants
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, cursor: "pointer" }}>
        <div onClick={() => setIsAnonymous(!isAnonymous)} style={{
          width: 20, height: 20, borderRadius: "var(--radius-sm)",
          border: `2px solid ${isAnonymous ? "var(--violet-light)" : "var(--border)"}`,
          background: isAnonymous ? "var(--violet-light)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all 0.15s",
        }}>
          {isAnonymous && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
        </div>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>Publier de façon anonyme</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Votre nom ne sera pas affiché.</div>
        </div>
      </label>
      {error && <div style={{ color: "var(--error)", fontSize: 12, marginTop: 10 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
        <button onClick={() => setOpen(false)} style={{
          background: "var(--surface-2)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)", padding: "9px 18px",
          color: "var(--text-muted)", cursor: "pointer", fontSize: 13,
          fontFamily: "var(--font-body)",
        }}>Annuler</button>
        <button onClick={submit} disabled={saving || content.trim().length < 10} style={{
          background: saving || content.trim().length < 10
            ? "var(--surface-2)"
            : "linear-gradient(135deg, var(--violet-dark), var(--violet-light))",
          border: "none", borderRadius: "var(--radius-md)", padding: "9px 20px",
          color: saving || content.trim().length < 10 ? "var(--text-muted)" : "#fff",
          fontWeight: 700, cursor: saving || content.trim().length < 10 ? "not-allowed" : "pointer",
          fontSize: 13, fontFamily: "var(--font-body)",
        }}>
          {saving ? "Publication..." : "Partager ma prière"}
        </button>
      </div>
    </div>
  );
}

// ─── Carte de requête de prière ───────────────────────────────
function PrayerCard({ prayer, currentUserId, currentUserProfile, isInterceding, onIntercede, onMarkAnswered, onDelete, onReplyAdded, onReplyDeleted }: {
  prayer: Prayer;
  currentUserId: string;
  currentUserProfile: any;
  isInterceding: boolean;
  onIntercede: () => void;
  onMarkAnswered: () => void;
  onDelete: () => void;
  onReplyAdded: (reply: PrayerReply) => void;
  onReplyDeleted: (replyId: string) => void;
}) {
  const [localCount, setLocalCount] = useState(prayer.intercessionsCount);
  const [localInterceding, setLocalInterceding] = useState(isInterceding);
  const [showReplies, setShowReplies] = useState(false);
  const isMyPrayer = prayer.user_id === currentUserId;
  const replyCount = prayer.comments.length;

  function handleIntercede() {
    setLocalInterceding(!localInterceding);
    setLocalCount((c) => localInterceding ? c - 1 : c + 1);
    onIntercede();
  }

  return (
    <div style={{
      background: "var(--card-bg)",
      border: `1px solid ${prayer.is_answered ? "rgba(22,163,74,0.3)" : "var(--border)"}`,
      borderRadius: "var(--radius-lg)", marginBottom: 12, overflow: "hidden",
      boxShadow: prayer.is_answered ? "0 0 0 1px rgba(22,163,74,0.15)" : "var(--shadow-sm)",
    }}>
      {prayer.is_answered && (
        <div style={{
          background: "rgba(22,163,74,0.08)", padding: "6px 16px",
          fontSize: 11, color: "var(--success)", fontWeight: 600,
          display: "flex", alignItems: "center", gap: 6,
          borderBottom: "1px solid rgba(22,163,74,0.15)",
        }}>
          <span>✅</span> Prière exaucée — Gloire à Dieu !
        </div>
      )}
      <div style={{ padding: 16 }}>
        {/* En-tête */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
          {prayer.is_anonymous
            ? <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--surface-2)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0,
              }}>🙏</div>
            : <Avatar profile={prayer.user_profiles} size={36} />
          }
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
              {prayer.is_anonymous ? "Membre anonyme" : (prayer.user_profiles?.display_name || "Membre")}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(prayer.created_at)}</div>
          </div>
          {isMyPrayer && (
            <div style={{ display: "flex", gap: 4 }}>
              {!prayer.is_answered && (
                <button onClick={onMarkAnswered} style={{
                  background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)",
                  borderRadius: "var(--radius-sm)", padding: "4px 8px",
                  color: "var(--success)", cursor: "pointer", fontSize: 12,
                  fontFamily: "var(--font-body)",
                }}>✅ Exaucée</button>
              )}
              <button onClick={onDelete} style={{
                background: "none", border: "none", color: "var(--text-muted)",
                cursor: "pointer", fontSize: 14, padding: "4px 6px",
              }}>🗑️</button>
            </div>
          )}
        </div>

        {/* Contenu */}
        <p style={{
          fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7,
          margin: "0 0 14px", whiteSpace: "pre-wrap",
        }}>{prayer.content}</p>

        {/* Actions */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleIntercede} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: localInterceding ? "rgba(90,44,160,0.1)" : "var(--surface)",
            border: `1px solid ${localInterceding ? "var(--violet-light)" : "var(--border)"}`,
            borderRadius: "var(--radius-full)", padding: "7px 14px",
            color: localInterceding ? "var(--violet-light)" : "var(--text-muted)",
            cursor: "pointer", fontSize: 13, fontWeight: localInterceding ? 700 : 400,
            transition: "all 0.15s", fontFamily: "var(--font-body)",
          }}>
            <span style={{ fontSize: 15 }}>🙏</span>
            Je prie pour toi
            {localCount > 0 && (
              <span style={{
                background: localInterceding ? "rgba(90,44,160,0.15)" : "var(--surface-2)",
                borderRadius: "var(--radius-full)", padding: "1px 7px",
                fontSize: 12, color: localInterceding ? "var(--violet-light)" : "var(--text-muted)",
                fontWeight: 600,
              }}>{localCount}</span>
            )}
          </button>

          <button onClick={() => setShowReplies(!showReplies)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: showReplies ? "rgba(212,175,55,0.08)" : "var(--surface)",
            border: `1px solid ${showReplies ? "rgba(212,175,55,0.35)" : "var(--border)"}`,
            borderRadius: "var(--radius-full)", padding: "7px 14px",
            color: showReplies ? "var(--gold)" : "var(--text-muted)",
            cursor: "pointer", fontSize: 13, fontWeight: showReplies ? 700 : 400,
            transition: "all 0.15s", fontFamily: "var(--font-body)",
          }}>
            <span style={{ fontSize: 15 }}>💬</span>
            {replyCount > 0 ? `${replyCount} réponse${replyCount > 1 ? "s" : ""}` : "Répondre"}
          </button>
        </div>
      </div>

      {showReplies && (
        <ReplySection
          prayerId={prayer.id}
          replies={prayer.comments}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          onReplyAdded={onReplyAdded}
          onReplyDeleted={onReplyDeleted}
        />
      )}
    </div>
  );
}

// ─── PrayerClient (export principal) ─────────────────────────
export default function PrayerClient({ prayers: initialPrayers, currentUserId, currentUserProfile, myIntercessedIds }: {
  prayers: Prayer[];
  currentUserId: string;
  currentUserProfile: any;
  myIntercessedIds: string[];
}) {
  const [prayers, setPrayers] = useState<Prayer[]>(initialPrayers);
  const [intercessedIds, setIntercessedIds] = useState<Set<string>>(new Set(myIntercessedIds));
  const [filter, setFilter] = useState<"all" | "mine" | "answered">("all");

  async function handleIntercede(prayerId: string) {
    const supabase = createClient();
    if (intercessedIds.has(prayerId)) {
      await supabase.from("prayer_intercessions").delete().eq("prayer_id", prayerId).eq("user_id", currentUserId);
      setIntercessedIds((s) => { const n = new Set(s); n.delete(prayerId); return n; });
    } else {
      await supabase.from("prayer_intercessions").insert({ prayer_id: prayerId, user_id: currentUserId });
      setIntercessedIds((s) => new Set([...s, prayerId]));
    }
  }

  async function handleMarkAnswered(prayerId: string) {
    const supabase = createClient();
    await supabase.from("prayer_requests").update({ is_answered: true }).eq("id", prayerId);
    setPrayers((prev) => prev.map((p) => p.id === prayerId ? { ...p, is_answered: true } : p));
  }

  async function handleDelete(prayerId: string) {
    if (!confirm("Supprimer cette requête de prière ?")) return;
    const supabase = createClient();
    await supabase.from("prayer_requests").delete().eq("id", prayerId);
    setPrayers((prev) => prev.filter((p) => p.id !== prayerId));
  }

  function handleReplyAdded(prayerId: string, reply: PrayerReply) {
    setPrayers((prev) => prev.map((p) => p.id === prayerId ? { ...p, comments: [...p.comments, reply] } : p));
  }

  function handleReplyDeleted(prayerId: string, replyId: string) {
    setPrayers((prev) => prev.map((p) =>
      p.id === prayerId ? { ...p, comments: p.comments.filter((c) => c.id !== replyId) } : p
    ));
  }

  const filtered = prayers.filter((p) => {
    if (filter === "mine") return p.user_id === currentUserId;
    if (filter === "answered") return p.is_answered;
    return true;
  });

  const totalPriants = prayers.reduce((acc, p) => acc + p.intercessionsCount, 0);
  const answeredCount = prayers.filter((p) => p.is_answered).length;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "13px 16px",
    background: "none",
    border: "none",
    borderBottom: `2px solid ${active ? "var(--gold)" : "transparent"}`,
    color: active ? "var(--gold)" : "var(--text-muted)",
    fontWeight: active ? 700 : 400,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "var(--font-body)",
    transition: "all 0.2s",
  });

  return (
    <div style={{ background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>

      {/* Sub-nav tabs */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", overflowX: "auto" }}>
          <button style={tabStyle(filter === "all")} onClick={() => setFilter("all")}>
            🙏 Toutes {prayers.length > 0 ? `(${prayers.length})` : ""}
          </button>
          <button style={tabStyle(filter === "mine")} onClick={() => setFilter("mine")}>
            📝 Mes requêtes
          </button>
          <button style={tabStyle(filter === "answered")} onClick={() => setFilter("answered")}>
            ✅ Exaucées {answeredCount > 0 ? `(${answeredCount})` : ""}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 48px" }}>

        {/* Formulaire */}
        <PrayerForm
          currentUserProfile={currentUserProfile}
          currentUserId={currentUserId}
          onSubmitted={(prayer) => setPrayers((prev) => [prayer, ...prev])}
        />

        {/* Liste */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🕊️</div>
            <div style={{ color: "var(--text-muted)", fontSize: 15 }}>
              {filter === "mine" ? "Vous n'avez pas encore soumis de requête."
                : filter === "answered" ? "Aucune prière exaucée pour l'instant."
                : "Aucune requête de prière pour l'instant."}
            </div>
          </div>
        ) : (
          filtered.map((prayer) => (
            <PrayerCard
              key={prayer.id}
              prayer={prayer}
              currentUserId={currentUserId}
              currentUserProfile={currentUserProfile}
              isInterceding={intercessedIds.has(prayer.id)}
              onIntercede={() => handleIntercede(prayer.id)}
              onMarkAnswered={() => handleMarkAnswered(prayer.id)}
              onDelete={() => handleDelete(prayer.id)}
              onReplyAdded={(reply) => handleReplyAdded(prayer.id, reply)}
              onReplyDeleted={(replyId) => handleReplyDeleted(prayer.id, replyId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
