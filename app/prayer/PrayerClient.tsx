"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PRAYER_THEME as T, PRAYER_FONTS as F,
  PRAYER_CATEGORIES, getPrayerCategoryDef,
  VISIBILITY_OPTIONS,
  notifyPrayerStaff, notifyPrayerAuthor,
  type PrayerCategory, type PrayerVisibility,
} from "@/lib/prayer/theme";

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
      // eslint-disable-next-line @next/next/no-img-element
      <img src={profile.avatar_url} alt={name}
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
      borderRadius: 14, padding: "12px 14px",
      display: "flex", alignItems: "center", gap: 12,
      cursor: "pointer", marginBottom: 16,
      boxShadow: T.shadowSoft,
    }}>
      <Avatar profile={currentUserProfile} size={36} />
      <div style={{ flex: 1, color: T.textMuted, fontSize: 14, fontFamily: F.body }}>
        Partager une demande de prière…
      </div>
      <span style={{ fontSize: 20 }}>🙏</span>
    </div>
  );

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: 18, marginBottom: 16,
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
  onIntercede, onComment, onReply, onCommentLike, onDelete, onMarkAnswered,
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

          <div style={{ flex: 1 }} />

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
  prayers: initialPrayers, currentUserId, currentUserProfile, myIntercessedIds,
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
        .ccb-prayer-hero { padding: 22px 14px 18px; }
        .ccb-prayer-title { font-size: clamp(1.3rem, 4.5vw, 1.6rem); }
        .ccb-prayer-tagline { font-size: clamp(10px, 2.8vw, 12px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (min-width: 768px) {
          .ccb-prayer-hero { padding: 32px 24px 28px; }
          .ccb-prayer-title { font-size: 2rem; }
          .ccb-prayer-tagline { font-size: 14px; white-space: normal; }
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
        <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "center" }}>
          <h1 className="ccb-prayer-title" style={{
            fontFamily: F.title, fontWeight: 700, margin: "0 0 4px",
            letterSpacing: "0.05em",
          }}>
            🙏 PRIONS ENSEMBLE
          </h1>
          <p className="ccb-prayer-tagline" style={{
            margin: 0, opacity: 0.9, fontStyle: "italic",
            color: "#EDE7FA",
          }}>
            Portons-nous les uns les autres devant le Père.
          </p>
        </div>
      </div>

      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}` }}>
        <div style={{
          maxWidth: 760, margin: "0 auto",
          display: "flex", overflowX: "auto",
        }}>
          {([
            { id: "active",   label: "🙏 Demandes actives", count: stats.active },
            { id: "mine",     label: "🙋 Mes prières",       count: stats.mine },
            { id: "answered", label: "🎉 Exaucées",         count: stats.answered },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "12px 16px", background: "none", border: "none",
              borderBottom: `2px solid ${tab === t.id ? T.violet : "transparent"}`,
              color: tab === t.id ? T.violet : T.textMuted,
              fontWeight: tab === t.id ? 700 : 500, fontSize: 13,
              cursor: "pointer", whiteSpace: "nowrap", fontFamily: F.body,
            }}>
              {t.label} · {t.count}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 14px 48px" }}>
        {/* Ma vie de prière — 3 stats compactes */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8, marginBottom: 14,
        }}>
          <StatChip emoji="🙏" label="Intercessions données" value={myLife.given} accent={T.violet} />
          <StatChip emoji="❤️" label="Reçues sur les miennes" value={myLife.received} accent={T.gold} />
          <StatChip emoji="🎉" label="Mes exaucées" value={myLife.answered} accent={T.answered} />
        </div>

        <PrayerComposer
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          onCreated={handleCreated}
        />

        <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
          <button onClick={() => setFilterCat("")} style={catChip(filterCat === "")}>
            📚 Toutes
          </button>
          {PRAYER_CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? "" : c.id)}
              style={catChip(filterCat === c.id, c.color)}>
              {c.emoji} {c.label}
            </button>
          ))}
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
function StatChip({ emoji, label, value, accent }: {
  emoji: string; label: string; value: number; accent: string;
}) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: "10px 8px",
      position: "relative", overflow: "hidden",
      textAlign: "center",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: 3,
        background: accent,
      }} />
      <div style={{ fontSize: 18, marginBottom: 2 }}>{emoji}</div>
      <div style={{
        fontFamily: F.title, fontSize: 18, fontWeight: 700,
        color: T.text, lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 9, color: T.textMuted, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4,
        lineHeight: 1.3,
      }}>
        {label}
      </div>
    </div>
  );
}

function catChip(active: boolean, color?: string): React.CSSProperties {
  const c = color ?? T.violet;
  return {
    flexShrink: 0,
    background: active ? `${c}1f` : T.card,
    border: `1px solid ${active ? c : T.border}`,
    color: active ? c : T.textMuted,
    fontSize: 11, fontWeight: active ? 700 : 500,
    borderRadius: 999, padding: "5px 12px",
    cursor: "pointer", whiteSpace: "nowrap", fontFamily: F.body,
  };
}
