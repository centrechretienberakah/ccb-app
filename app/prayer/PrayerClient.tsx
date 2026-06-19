"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PRAYER_THEME as T, PRAYER_FONTS as F,
  PRAYER_CATEGORIES, getPrayerCategoryDef,
  VISIBILITY_OPTIONS,
  notifyPrayerStaff, notifyPrayerAuthor,
  type PrayerCategory, type PrayerVisibility,
} from "@/lib/prayer/theme";
import { sharePrayer } from "@/lib/prayer/share";
import Link from "next/link";

interface Profile { user_id: string; display_name: string | null; avatar_url: string | null }
interface PrayerComment {
  id: string; prayer_id: string; user_id: string;
  content: string; created_at: string;
  parent_comment_id?: string | null;
  user_profiles: Profile | null;
  likeCount: number;
  liked: boolean;
}
interface Prayer {
  id: string; user_id: string;
  title: string | null;
  content: string;
  category: string | null;
  visibility: string | null;
  is_anonymous: boolean;
  is_answered: boolean;
  answered_at: string | null;
  answered_with: string | null;
  created_at: string;
  intercessionsCount: number;
  user_profiles: Profile | null;
  comments: PrayerComment[];
}

interface Props {
  prayers: Prayer[];
  currentUserId: string;
  currentUserProfile: Profile | null;
  myIntercessedIds: string[];
  isAdmin?: boolean;
}

function timeAgo(iso: string): string {
  const d = new Date(iso); const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

function Avatar({ profile, size = 36, anonymous = false }: { profile?: Profile | null; size?: number; anonymous?: boolean }) {
  if (anonymous) return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: T.surface2, color: T.textMuted,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.45,
    }}>🤫</div>
  );
  const name = profile?.display_name || "?";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (profile?.avatar_url) {
    return (
      <img loading="lazy" decoding="async" src={profile.avatar_url} alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff",
    }}>{initials}</div>
  );
}

// ─── PrayerComposer ─────────────────────────────────────────────────
function PrayerComposer({
  currentUserId, currentUserProfile, onCreated,
}: {
  currentUserId: string;
  currentUserProfile: Profile | null;
  onCreated: (p: Prayer) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PrayerCategory>("autre");
  const [visibility, setVisibility] = useState<PrayerVisibility>("members");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!content.trim()) { setError("Le texte de la demande est requis."); return; }
    setSaving(true); setError("");
    const supabase = createClient();
    const { data, error: e } = await supabase.from("prayer_requests").insert({
      user_id: currentUserId,
      title: title.trim() || null,
      content: content.trim(),
      category, visibility,
      is_anonymous: isAnonymous,
    }).select("id, user_id, title, content, category, visibility, is_anonymous, is_answered, answered_at, answered_with, created_at").single();
    if (e) { setError(e.message); setSaving(false); return; }
    const row = data as Prayer;
    onCreated({
      ...row,
      intercessionsCount: 0,
      user_profiles: isAnonymous ? null : currentUserProfile,
      comments: [],
    });
    const cat = getPrayerCategoryDef(category);
    const author = isAnonymous ? "Un membre (anonyme)" : (currentUserProfile?.display_name || "Un membre");
    notifyPrayerStaff(
      `${cat.emoji} ${author} a une nouvelle demande : ${cat.label}`,
      (title.trim() || content).slice(0, 140),
      "/prayer",
    );
    setOpen(false); setTitle(""); setContent(""); setCategory("autre");
    setVisibility("members"); setIsAnonymous(false); setSaving(false);
  }

  if (!open) return (
    <div onClick={() => setOpen(true)} style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 999, padding: "5px 12px 5px 6px",
      display: "flex", alignItems: "center", gap: 8,
      cursor: "pointer",
      boxShadow: T.shadowSoft,
    }}>
      <Avatar profile={currentUserProfile} size={24} />
      <div style={{
        flex: 1, minWidth: 0, color: T.textMuted, fontSize: 12.5, fontFamily: F.body,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        Partager une demande de prière…
      </div>
      <span style={{ fontSize: 15, flexShrink: 0 }}>🙏</span>
    </div>
  );

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: 18,
      boxShadow: T.shadowSoft,
    }}>
      <div style={{
        fontFamily: F.title, fontSize: 14, fontWeight: 700,
        color: T.violet, marginBottom: 12,
      }}>
        🙏 Nouvelle demande de prière
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4, letterSpacing: 0.4 }}>
            CATÉGORIE
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value as PrayerCategory)}
            style={selectStyle}>
            {PRAYER_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4, letterSpacing: 0.4 }}>
            VISIBILITÉ
          </div>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as PrayerVisibility)}
            style={selectStyle}>
            {VISIBILITY_OPTIONS.map((v) => (
              <option key={v.id} value={v.id}>{v.emoji} {v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre (optionnel mais conseillé)" maxLength={140}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "11px 14px", marginBottom: 10,
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
          color: T.text, fontSize: 16, fontWeight: 700,
          fontFamily: F.title, outline: "none",
        }}
      />

      <textarea value={content} onChange={(e) => setContent(e.target.value)}
        placeholder="Partage ta demande de prière en détail…"
        rows={4}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "11px 14px", marginBottom: 10,
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
          color: T.text, fontSize: 14, lineHeight: 1.55,
          fontFamily: F.body, outline: "none", resize: "vertical",
        }}
      />

      <label style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
        cursor: "pointer", fontSize: 13, color: T.textSoft, fontFamily: F.body,
      }}>
        <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)}
          style={{ accentColor: T.violet, width: 16, height: 16, cursor: "pointer" }} />
        🤫 Publier anonymement
      </label>

      {error && (
        <div style={{ color: "#C24B7A", fontSize: 12, marginBottom: 10 }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={() => setOpen(false)} style={btnGhost}>Annuler</button>
        <button onClick={submit} disabled={saving} style={{
          ...btnPrimary,
          opacity: !content.trim() ? 0.5 : 1,
          cursor: saving ? "wait" : "pointer",
        }}>
          {saving ? "Envoi…" : "🙏 Demander"}
        </button>
      </div>
    </div>
  );
}

// ─── PrayerCard ────────────────────────────────────────────────────
function PrayerCard({
  prayer, currentUserId, hasIntercessed,
  onIntercede, onComment, onReply, onCommentLike, onDelete, onMarkAnswered, onShare, onReport,
}: {
  prayer: Prayer;
  currentUserId: string;
  hasIntercessed: boolean;
  onIntercede: () => Promise<void>;
  onComment: (text: string) => Promise<void>;
  onReply: (parentId: string, text: string) => Promise<void>;
  onCommentLike: (commentId: string) => void;
  onDelete: () => void;
  onMarkAnswered: (testimony: string) => Promise<void>;
  onShare: () => void;
  onReport: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [intercessing, setIntercessing] = useState(false);
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answerText, setAnswerText] = useState("");

  const isMine = prayer.user_id === currentUserId;
  const catDef = getPrayerCategoryDef(prayer.category);
  const visibility = (prayer.visibility ?? "members") as PrayerVisibility;
  const visDef = VISIBILITY_OPTIONS.find((v) => v.id === visibility);

  async function handleIntercede() {
    if (intercessing) return;
    setIntercessing(true);
    try {
      await onIntercede();
    } catch (e) {
      alert("Erreur intercession : " + (e as Error).message);
    } finally {
      setIntercessing(false);
    }
  }

  async function handleSubmitComment() {
    const t = commentText.trim();
    if (!t) return;
    setBusy(true);
    await onComment(t);
    setCommentText("");
    setBusy(false);
  }

  async function handleSubmitReply() {
    if (!replyingTo) return;
    const t = replyText.trim();
    if (!t) return;
    setBusy(true);
    await onReply(replyingTo, t);
    setReplyText("");
    setReplyingTo(null);
    setBusy(false);
  }

  async function handleMarkAnswered() {
    const t = answerText.trim();
    if (!t) return;
    setBusy(true);
    await onMarkAnswered(t);
    setBusy(false);
    setShowAnswerForm(false);
    setAnswerText("");
  }

  return (
    <div style={{
      background: T.card, border: `1px solid ${prayer.is_answered ? T.answered : T.border}`,
      borderRadius: 14, marginBottom: 12, overflow: "hidden",
      boxShadow: T.shadowSoft,
    }}>
      {prayer.is_answered && (
        <div style={{
          background: "rgba(46,155,71,0.08)", borderBottom: `1px solid rgba(46,155,71,0.2)`,
          padding: "8px 16px", fontSize: 12,
          color: T.answered, fontWeight: 700, fontFamily: F.body,
        }}>
          🎉 Exaucée {prayer.answered_at && `· ${timeAgo(prayer.answered_at)}`}
        </div>
      )}

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
          <Avatar profile={prayer.user_profiles} size={38} anonymous={prayer.is_anonymous} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: 14, color: T.text, fontFamily: F.body,
            }}>
              {prayer.is_anonymous ? "Demande anonyme" : (prayer.user_profiles?.display_name || "Membre")}
            </div>
            <div style={{
              display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap",
              fontSize: 11, color: T.textMuted, marginTop: 2,
            }}>
              <span>{timeAgo(prayer.created_at)}</span>
              {visDef && <span title={visDef.desc}>· {visDef.emoji} {visDef.label}</span>}
            </div>
          </div>
          <span style={{
            background: `${catDef.color}1f`, border: `1px solid ${catDef.color}55`,
            borderRadius: 999, padding: "3px 10px", fontSize: 10,
            color: catDef.color, fontWeight: 700, flexShrink: 0,
          }}>
            {catDef.emoji} {catDef.label}
          </span>
          {isMine && (
            <button onClick={onDelete} title="Supprimer" style={{
              background: "none", border: "none", color: T.textMuted,
              cursor: "pointer", fontSize: 13, padding: "2px 6px",
            }}>🗑️</button>
          )}
        </div>

        {prayer.title && (
          <h3 style={{
            fontFamily: F.title, fontSize: 17, fontWeight: 800,
            color: T.text, margin: "0 0 6px", lineHeight: 1.35,
          }}>
            {prayer.title}
          </h3>
        )}

        <p style={{
          fontSize: 14, color: T.textSoft, lineHeight: 1.6,
          margin: "0 0 12px", whiteSpace: "pre-wrap", fontFamily: F.body,
        }}>
          {prayer.content}
        </p>

        {prayer.is_answered && prayer.answered_with && (
          <div style={{
            background: "rgba(46,155,71,0.06)",
            border: `1px solid rgba(46,155,71,0.25)`,
            borderLeft: `3px solid ${T.answered}`,
            borderRadius: "0 10px 10px 0", padding: "10px 14px",
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: T.answered,
              textTransform: "uppercase", letterSpacing: 0.06, marginBottom: 4,
            }}>
              ✨ Témoignage d&apos;exaucement
            </div>
            <p style={{
              margin: 0, fontSize: 13, color: T.textSoft, lineHeight: 1.55,
              fontStyle: "italic", fontFamily: F.body,
            }}>
              « {prayer.answered_with} »
            </p>
          </div>
        )}

        <div style={{
          display: "flex", gap: 6, paddingTop: 10,
          borderTop: `1px solid ${T.borderSoft}`, alignItems: "center", flexWrap: "wrap",
        }}>
          <button onClick={handleIntercede} disabled={intercessing} title="J'intercède" style={{
            background: hasIntercessed ? T.violetSoft : "transparent",
            border: `1px solid ${hasIntercessed ? T.violet : T.border}`,
            borderRadius: 999, padding: "7px 14px",
            display: "flex", alignItems: "center", gap: 6,
            cursor: intercessing ? "wait" : "pointer", fontFamily: F.body,
            color: hasIntercessed ? T.violet : T.textSoft,
            fontWeight: hasIntercessed ? 700 : 600, fontSize: 13,
            transition: "all 0.15s",
            opacity: intercessing ? 0.6 : 1,
          }}>
            <span style={{ fontSize: 16 }}>🙏</span>
            <span>J&apos;intercède{prayer.intercessionsCount > 0 ? ` · ${prayer.intercessionsCount}` : ""}</span>
          </button>

          <button onClick={() => setShowComments(!showComments)} style={{
            background: "none", border: "none",
            padding: "7px 12px", borderRadius: 8,
            color: T.textMuted, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 13, fontWeight: 600, fontFamily: F.body,
          }}>
            <span style={{ fontSize: 15 }}>💬</span>
            {prayer.comments.length > 0 && <span>{prayer.comments.length}</span>}
          </button>

          <button onClick={onShare} title="Partager" style={{
            background: "none", border: "none",
            padding: "7px 12px", borderRadius: 8,
            color: T.textMuted, cursor: "pointer",
            display: "flex", alignItems: "center",
            fontSize: 18, fontWeight: 600,
          }}>
            <span style={{ transform: "scaleX(-1)", display: "inline-block" }}>↪</span>
          </button>

          <div style={{ flex: 1 }} />

          {!isMine && (
            <button onClick={onReport} title="Signaler" style={{
              background: "none", border: "none",
              padding: "7px 10px", borderRadius: 8,
              color: T.textMuted, cursor: "pointer", fontSize: 14,
            }}>
              ⚠️
            </button>
          )}
          {isMine && !prayer.is_answered && (
            <button onClick={() => setShowAnswerForm(!showAnswerForm)} style={{
              background: `linear-gradient(135deg, ${T.answered}, #1e7a35)`,
              border: "none", borderRadius: 999, padding: "7px 14px",
              color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: F.body,
            }}>
              🎉 Marquer exaucée
            </button>
          )}
        </div>
      </div>

      {showAnswerForm && (
        <div style={{
          background: "rgba(46,155,71,0.05)",
          borderTop: `1px solid rgba(46,155,71,0.2)`,
          padding: 14,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: T.answered,
            marginBottom: 6, fontFamily: F.body,
          }}>
            Témoignage d&apos;exaucement (comment Dieu a répondu ?)
          </div>
          <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Comment Dieu a-t-il répondu à cette prière ?" rows={3}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "9px 12px", marginBottom: 8,
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
              color: T.text, fontSize: 13, fontFamily: F.body, outline: "none",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button onClick={() => setShowAnswerForm(false)} style={btnGhost}>Annuler</button>
            <button onClick={handleMarkAnswered} disabled={busy || !answerText.trim()} style={{
              background: T.answered, color: "#fff", border: "none",
              borderRadius: 999, padding: "7px 14px",
              fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer",
              fontFamily: F.body, opacity: !answerText.trim() ? 0.5 : 1,
            }}>
              {busy ? "Envoi…" : "✓ Confirmer"}
            </button>
          </div>
        </div>
      )}

      {showComments && (
        <div style={{
          background: T.surface2, borderTop: `1px solid ${T.borderSoft}`,
          padding: "12px 16px",
        }}>
          {prayer.comments.length === 0 ? (
            <div style={{
              fontSize: 12, color: T.textMuted, fontStyle: "italic",
              padding: "8px 0", textAlign: "center",
            }}>
              Sois le premier à encourager.
            </div>
          ) : (() => {
            const tops = prayer.comments.filter((c) => !c.parent_comment_id);
            const repliesByParent = prayer.comments
              .filter((c) => c.parent_comment_id)
              .reduce<Record<string, PrayerComment[]>>((acc, c) => {
                const k = c.parent_comment_id as string;
                (acc[k] = acc[k] || []).push(c);
                return acc;
              }, {});
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
                {tops.map((c) => (
                  <div key={c.id}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Avatar profile={c.user_profiles} size={28} />
                      <div style={{ flex: 1, background: T.card, borderRadius: 10, padding: "7px 11px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>
                          {c.user_profiles?.display_name || "Membre"}
                        </div>
                        <div style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.5 }}>
                          {c.content}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 11, display: "flex", gap: 14 }}>
                          <button onClick={() => onCommentLike(c.id)} style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: c.liked ? "#1877F2" : T.textMuted,
                            display: "flex", alignItems: "center", gap: 4, padding: 0,
                            fontWeight: c.liked ? 700 : 500,
                          }}>
                            <span style={{ filter: c.liked ? "none" : "grayscale(100%) opacity(0.55)" }}>👍</span>
                            {c.likeCount > 0 ? c.likeCount : ""}
                          </button>
                          <button onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)} style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: T.textMuted, padding: 0,
                          }}>
                            ↩ Répondre
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Réponses imbriquées */}
                    {(repliesByParent[c.id] ?? []).map((r) => (
                      <div key={r.id} style={{ display: "flex", gap: 8, marginTop: 6, marginLeft: 36 }}>
                        <Avatar profile={r.user_profiles} size={24} />
                        <div style={{ flex: 1, background: T.card, borderRadius: 8, padding: "6px 10px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>
                            {r.user_profiles?.display_name || "Membre"}
                          </div>
                          <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.5 }}>
                            {r.content}
                          </div>
                          <div style={{ marginTop: 3, fontSize: 11 }}>
                            <button onClick={() => onCommentLike(r.id)} style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: r.liked ? "#1877F2" : T.textMuted,
                              display: "flex", alignItems: "center", gap: 4, padding: 0,
                              fontWeight: r.liked ? 700 : 500,
                            }}>
                              <span style={{ filter: r.liked ? "none" : "grayscale(100%) opacity(0.55)" }}>👍</span>
                              {r.likeCount > 0 ? r.likeCount : ""}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Input réponse */}
                    {replyingTo === c.id && (
                      <div style={{ display: "flex", gap: 6, marginTop: 6, marginLeft: 36 }}>
                        <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSubmitReply()}
                          placeholder="Répondre…" autoFocus
                          style={{
                            flex: 1, padding: "6px 10px",
                            background: T.card, border: `1px solid ${T.border}`,
                            borderRadius: 999, color: T.text, fontSize: 12,
                            fontFamily: F.body, outline: "none",
                          }}
                        />
                        <button onClick={handleSubmitReply} disabled={busy || !replyText.trim()} style={{
                          background: T.violet, color: "#fff", border: "none",
                          borderRadius: 999, padding: "6px 12px", cursor: busy ? "wait" : "pointer",
                          fontWeight: 700, fontSize: 12,
                        }}>➤</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
          <div style={{ display: "flex", gap: 6 }}>
            <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
              placeholder="Encourage cette personne…"
              style={{
                flex: 1, padding: "8px 12px",
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 999, color: T.text, fontSize: 13,
                fontFamily: F.body, outline: "none",
              }}
            />
            <button onClick={handleSubmitComment} disabled={busy || !commentText.trim()} style={{
              background: T.violet, color: "#fff", border: "none",
              borderRadius: 999, padding: "8px 14px", cursor: busy ? "wait" : "pointer",
              fontWeight: 700, fontSize: 13,
            }}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PrayerClient principal ────────────────────────────────────────
export default function PrayerClient({
  prayers: initialPrayers, currentUserId, currentUserProfile, myIntercessedIds, isAdmin = false,
}: Props) {
  const [prayers, setPrayers] = useState<Prayer[]>(initialPrayers);
  const [intercessedIds, setIntercessedIds] = useState<Set<string>>(new Set(myIntercessedIds));
  const [tab, setTab] = useState<"active" | "mine" | "answered">("active");
  const [filterCat, setFilterCat] = useState<PrayerCategory | "">("");

  // Realtime placeholder (sync minimal — refetch on demand peut être ajouté)
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel("ccb-prayer-sync").subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    let out = prayers;
    if (tab === "mine") out = out.filter((p) => p.user_id === currentUserId);
    else if (tab === "answered") out = out.filter((p) => p.is_answered);
    else out = out.filter((p) => !p.is_answered);
    if (filterCat) out = out.filter((p) => (p.category ?? "autre") === filterCat);
    return out;
  }, [prayers, tab, filterCat, currentUserId]);

  const stats = useMemo(() => ({
    active: prayers.filter((p) => !p.is_answered).length,
    mine: prayers.filter((p) => p.user_id === currentUserId).length,
    answered: prayers.filter((p) => p.is_answered).length,
  }), [prayers, currentUserId]);

  const myLife = useMemo(() => {
    const myPrayers = prayers.filter((p) => p.user_id === currentUserId);
    return {
      given: intercessedIds.size,                                          // intercessions que j'ai données
      received: myPrayers.reduce((s, p) => s + p.intercessionsCount, 0),   // intercessions sur mes prières
      answered: myPrayers.filter((p) => p.is_answered).length,             // mes prières exaucées
    };
  }, [prayers, intercessedIds, currentUserId]);

  function handleCreated(p: Prayer) {
    setPrayers((prev) => [p, ...prev]);
  }

  async function handleIntercede(prayerId: string) {
    const supabase = createClient();
    const already = intercessedIds.has(prayerId);
    if (already) {
      const { error } = await supabase.from("prayer_intercessions").delete()
        .eq("prayer_id", prayerId).eq("user_id", currentUserId);
      if (error) throw error;
      setIntercessedIds((s) => { const n = new Set(s); n.delete(prayerId); return n; });
      setPrayers((prev) => prev.map((p) => p.id === prayerId ? { ...p, intercessionsCount: Math.max(0, p.intercessionsCount - 1) } : p));
    } else {
      const { error } = await supabase.from("prayer_intercessions").insert({ prayer_id: prayerId, user_id: currentUserId });
      if (error) throw error;
      setIntercessedIds((s) => new Set([...s, prayerId]));
      setPrayers((prev) => prev.map((p) => p.id === prayerId ? { ...p, intercessionsCount: p.intercessionsCount + 1 } : p));
      // Notif auteur (best-effort, n'échoue pas l'action principale)
      const prayer = prayers.find((p) => p.id === prayerId);
      if (prayer) {
        notifyPrayerAuthor({
          authorId: prayer.user_id,
          actorId: currentUserId,
          actorName: currentUserProfile?.display_name || "Un membre",
          prayerId,
          type: "intercession",
        }).catch(() => { /* noop */ });
      }
    }
  }

  async function handleComment(prayerId: string, text: string, parentId?: string) {
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      prayer_id: prayerId, user_id: currentUserId, content: text,
    };
    if (parentId) payload.parent_comment_id = parentId;
    const { data } = await supabase.from("prayer_comments")
      .insert(payload)
      .select("id, prayer_id, user_id, content, created_at, parent_comment_id").single();
    if (!data) return;
    const newComment: PrayerComment = {
      ...(data as Omit<PrayerComment, "user_profiles" | "likeCount" | "liked">),
      user_profiles: currentUserProfile,
      likeCount: 0, liked: false,
    };
    setPrayers((prev) => prev.map((p) =>
      p.id === prayerId ? { ...p, comments: [...p.comments, newComment] } : p,
    ));

    // Notif :
    // - Si réponse à un commentaire → notif à l'auteur du commentaire parent
    // - Sinon → notif à l'auteur de la prière
    const prayer = prayers.find((p) => p.id === prayerId);
    if (!prayer) return;
    if (parentId) {
      const parent = prayer.comments.find((c) => c.id === parentId);
      if (parent) {
        notifyPrayerAuthor({
          authorId: parent.user_id,
          actorId: currentUserId,
          actorName: currentUserProfile?.display_name || "Un membre",
          prayerId,
          type: "comment_reply",
          excerpt: text,
        });
      }
    } else {
      notifyPrayerAuthor({
        authorId: prayer.user_id,
        actorId: currentUserId,
        actorName: currentUserProfile?.display_name || "Un membre",
        prayerId,
        type: "comment",
        excerpt: text,
      });
    }
  }

  async function handleCommentLike(prayerId: string, commentId: string) {
    const supabase = createClient();
    const post = prayers.find((p) => p.id === prayerId);
    const com = post?.comments.find((c) => c.id === commentId);
    const was = !!com?.liked;
    setPrayers((prev) => prev.map((p) =>
      p.id !== prayerId ? p : {
        ...p,
        comments: p.comments.map((c) =>
          c.id !== commentId ? c : { ...c, liked: !was, likeCount: (c.likeCount ?? 0) + (was ? -1 : 1) },
        ),
      },
    ));
    if (was) {
      await supabase.from("prayer_comment_likes").delete()
        .eq("comment_id", commentId).eq("user_id", currentUserId);
    } else {
      await supabase.from("prayer_comment_likes").insert({ comment_id: commentId, user_id: currentUserId });
    }
  }

  async function handleDelete(prayerId: string) {
    if (!confirm("Supprimer cette demande de prière ?")) return;
    const supabase = createClient();
    await supabase.from("prayer_requests").delete().eq("id", prayerId).eq("user_id", currentUserId);
    setPrayers((prev) => prev.filter((p) => p.id !== prayerId));
  }

  async function handleShare(prayer: Prayer) {
    const status = await sharePrayer({
      title: prayer.title,
      content: prayer.content,
      category: prayer.category ?? undefined,
      isAnonymous: prayer.is_anonymous,
      authorName: prayer.user_profiles?.display_name ?? undefined,
      isAnswered: prayer.is_answered,
      answeredWith: prayer.answered_with,
    });
    if (status === "shared" || status === "copied") {
      // Increment share_count (best-effort, ignore failure)
      try {
        const supabase = createClient();
        const current = (prayer as Prayer & { share_count?: number }).share_count ?? 0;
        await supabase.from("prayer_requests")
          .update({ share_count: current + 1 })
          .eq("id", prayer.id);
      } catch { /* noop */ }
    }
  }

  async function handleReport(prayerId: string) {
    const reason = prompt("Pourquoi signales-tu cette demande ? (motif court)");
    if (!reason || !reason.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("prayer_reports").insert({
      prayer_id: prayerId, user_id: currentUserId, reason: reason.trim(),
    });
    if (error) { alert("Erreur signalement : " + error.message); return; }
    alert("Merci, ton signalement a été transmis aux modérateurs.");
    notifyPrayerStaff(
      "⚠️ Nouveau signalement de prière",
      `Motif : ${reason.trim().slice(0, 100)}`,
      "/prayer/admin",
    );
  }

  async function handleMarkAnswered(prayerId: string, testimony: string) {
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase.from("prayer_requests")
      .update({ is_answered: true, answered_at: now, answered_with: testimony })
      .eq("id", prayerId).eq("user_id", currentUserId);
    setPrayers((prev) => prev.map((p) =>
      p.id === prayerId
        ? { ...p, is_answered: true, answered_at: now, answered_with: testimony }
        : p,
    ));
    notifyPrayerStaff(
      "🎉 Une prière a été exaucée !",
      testimony.slice(0, 140),
      "/prayer",
    );
  }

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body }}>
      <style>{`
        .ccb-prayer-hero { padding: 11px 14px 9px; }
        .ccb-prayer-title { font-size: clamp(1.05rem, 3.6vw, 1.3rem); margin: 0 0 2px; }
        .ccb-prayer-tagline { font-size: clamp(10px, 2.6vw, 11.5px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (min-width: 768px) {
          .ccb-prayer-hero { padding: 16px 24px 14px; }
          .ccb-prayer-title { font-size: 1.5rem; }
          .ccb-prayer-tagline { font-size: 13px; white-space: normal; }
        }
      `}</style>
      <div className="ccb-prayer-hero" style={{
        background: `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff", position: "relative", overflow: "hidden",
        boxShadow: T.shadowGlow,
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${T.gold}, transparent)`,
        }} />
        <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative", textAlign: "center", padding: "0 44px" }}>
          <h1 className="ccb-prayer-title" style={{
            fontFamily: F.title, fontWeight: 700, margin: "0 0 2px",
            letterSpacing: "0.05em",
          }}>
            🙏 MUR DE PRIÈRE
          </h1>
          <p className="ccb-prayer-tagline" style={{
            margin: 0, opacity: 0.9, fontStyle: "italic",
            color: "#EDE7FA",
          }}>
            Portons-nous les uns les autres devant le Père.
          </p>
          <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)" }}>
            <ViewStatsMenu tab={tab} setTab={setTab} stats={stats} myLife={myLife} isAdmin={isAdmin} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "10px 14px 48px" }}>
        {/* Partager une demande + filtre (menu ⋮) sur la même barre */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <PrayerComposer
              currentUserId={currentUserId}
              currentUserProfile={currentUserProfile}
              onCreated={handleCreated}
            />
          </div>
          <FilterMenu filterCat={filterCat} setFilterCat={setFilterCat} />
        </div>

        {filtered.length === 0 ? (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "50px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🕊️</div>
            <div style={{ color: T.textMuted, fontSize: 14 }}>
              {tab === "active" && "Aucune demande active. Sois le premier à partager !"}
              {tab === "mine" && "Tu n'as pas encore de demande de prière."}
              {tab === "answered" && "Aucune prière exaucée pour l'instant."}
            </div>
          </div>
        ) : (
          filtered.map((p) => (
            <PrayerCard
              key={p.id}
              prayer={p}
              currentUserId={currentUserId}
              hasIntercessed={intercessedIds.has(p.id)}
              onIntercede={() => handleIntercede(p.id)}
              onComment={(text) => handleComment(p.id, text)}
              onReply={(parentId, text) => handleComment(p.id, text, parentId)}
              onCommentLike={(cid) => handleCommentLike(p.id, cid)}
              onDelete={() => handleDelete(p.id)}
              onMarkAnswered={(testimony) => handleMarkAnswered(p.id, testimony)}
              onShare={() => handleShare(p)}
              onReport={() => handleReport(p.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Styles partagés ──────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", boxSizing: "border-box",
  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
  color: T.text, fontSize: 13, fontWeight: 600,
  fontFamily: F.body, cursor: "pointer", outline: "none",
};
const btnPrimary: React.CSSProperties = {
  background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
  border: "none", borderRadius: 10, padding: "9px 20px",
  color: "#fff", fontWeight: 700, fontSize: 13,
  cursor: "pointer", fontFamily: F.body,
};
const btnGhost: React.CSSProperties = {
  background: T.surface2, border: `1px solid ${T.border}`,
  borderRadius: 10, padding: "9px 18px",
  color: T.textMuted, cursor: "pointer", fontSize: 12,
  fontFamily: F.body,
};
// ─── Menu déroulant (sur la barre violette) : vues + statistiques ──────
type PrayerTab = "active" | "mine" | "answered";
function ViewStatsMenu({ tab, setTab, stats, myLife, isAdmin }: {
  tab: PrayerTab;
  setTab: (t: PrayerTab) => void;
  stats: { active: number; mine: number; answered: number };
  myLife: { given: number; received: number; answered: number };
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const VIEWS = [
    { id: "active" as const,   label: "🙏 Demandes actives", count: stats.active },
    { id: "mine" as const,     label: "🙋 Mes prières",       count: stats.mine },
    { id: "answered" as const, label: "🎉 Exaucées",          count: stats.answered },
  ];

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen((v) => !v)} aria-label="Vues et statistiques" title="Vues & statistiques" style={{
        width: 38, height: 38, borderRadius: 999, flexShrink: 0,
        background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.35)",
        color: "#fff", fontSize: 18, cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
        ☰
      </button>
      {open && (
        <div role="menu" style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
          minWidth: 244, background: T.card, color: T.text,
          border: `1px solid ${T.border}`, borderRadius: 12,
          boxShadow: "0 14px 36px rgba(0,0,0,0.22)", padding: 6, textAlign: "left",
        }}>
          <div style={menuLabel}>Affichage</div>
          {VIEWS.map((v) => (
            <button key={v.id} onClick={() => { setTab(v.id); setOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
              background: tab === v.id ? T.violetSoft : "none", border: "none", cursor: "pointer",
              color: tab === v.id ? T.violet : T.text, fontSize: 13, fontWeight: tab === v.id ? 700 : 500,
              fontFamily: F.body, padding: "9px 10px", borderRadius: 8,
            }}>
              <span style={{ flex: 1 }}>{v.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: tab === v.id ? T.violet : T.textMuted }}>{v.count}</span>
            </button>
          ))}

          <div style={{ height: 1, background: T.borderSoft, margin: "6px 4px" }} />
          <div style={menuLabel}>Ma vie de prière</div>
          <StatLine emoji="🙏" label="Intercessions données" value={myLife.given} />
          <StatLine emoji="❤️" label="Reçues sur les miennes" value={myLife.received} />
          <StatLine emoji="🎉" label="Mes exaucées" value={myLife.answered} />

          {isAdmin && (
            <>
              <div style={{ height: 1, background: T.borderSoft, margin: "6px 4px" }} />
              <Link href="/prayer/admin" onClick={() => setOpen(false)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8,
                textDecoration: "none", color: T.violet, fontSize: 13, fontWeight: 700, fontFamily: F.body,
              }}>
                🛡️ Modération
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const menuLabel: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 800, color: T.textMuted,
  textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 10px 4px",
};

function StatLine({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px" }}>
      <span style={{ fontSize: 15, width: 20, textAlign: "center", flexShrink: 0 }}>{emoji}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: T.textSoft }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: F.title }}>{value}</span>
    </div>
  );
}

// ─── Menu de filtre (⋮) — placé sur la même barre que « Partager une demande » ──
function FilterMenu({ filterCat, setFilterCat }: {
  filterCat: PrayerCategory | "";
  setFilterCat: (c: PrayerCategory | "") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = filterCat !== "";

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen((v) => !v)} title="Filtrer par catégorie" aria-label="Filtrer" style={{
        width: 36, height: 36, borderRadius: 999, flexShrink: 0,
        background: active ? T.violetSoft : T.card,
        border: `1px solid ${active ? T.violet : T.border}`,
        color: active ? T.violet : T.textMuted,
        cursor: "pointer", fontSize: 18, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
        boxShadow: T.shadowSoft,
      }}>
        ⋮
        {active && <span style={{ position: "absolute", top: 5, right: 6, width: 6, height: 6, borderRadius: "50%", background: T.violet }} />}
      </button>
      {open && (
        <div role="menu" style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 40,
          minWidth: 214, maxHeight: 340, overflowY: "auto",
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,0.18)", padding: 5,
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 10px 4px" }}>
            Filtrer par catégorie
          </div>
          <FilterRow active={filterCat === ""} emoji="📚" label="Toutes" onClick={() => { setFilterCat(""); setOpen(false); }} />
          {PRAYER_CATEGORIES.map((c) => (
            <FilterRow key={c.id} active={filterCat === c.id} emoji={c.emoji} label={c.label} color={c.color}
              onClick={() => { setFilterCat(filterCat === c.id ? "" : c.id); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({ active, emoji, label, color, onClick }: {
  active: boolean; emoji: string; label: string; color?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} role="menuitem" style={{
      display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
      background: active ? (color ? `${color}1f` : T.violetSoft) : "none",
      border: "none", cursor: "pointer",
      color: active ? (color ?? T.violet) : T.text,
      fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: F.body,
      padding: "8px 10px", borderRadius: 8,
    }}>
      <span style={{ fontSize: 15, width: 20, textAlign: "center", flexShrink: 0 }}>{emoji}</span>
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
      {active && <span style={{ color: color ?? T.violet, flexShrink: 0 }}>✓</span>}
    </button>
  );
}
