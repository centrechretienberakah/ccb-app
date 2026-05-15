"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export interface UnifiedDevotion {
  id: string | null;
  date: string;
  title: string;
  verse_ref: string;
  verse_text: string;
  content: string;
  application: string;
  prayer: string;
  declaration: string;
}

interface DevotionComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name: string;
}

interface Props {
  today: UnifiedDevotion;
  archives: UnifiedDevotion[];
  streak: number;
  userId: string | null;
  initialLikeCount: number;
  initialUserLiked: boolean;
  initialCommentsCount: number;
}

const SIGNATURE = "Rév. Elvis NGUIFFO";
const PUBLIC_URL = "https://centrechretienberakah.com";

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function fmtShortDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
  });
}

export default function DevotionClient({
  today, archives, streak, userId,
  initialLikeCount, initialUserLiked, initialCommentsCount,
}: Props) {
  const [active, setActive] = useState<UnifiedDevotion>(today);
  const [expanded, setExpanded] = useState(false);

  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [userLiked, setUserLiked] = useState(initialUserLiked);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);

  const [comments, setComments] = useState<DevotionComment[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [shared, setShared] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  // Re-fetch like/comment stats quand on change d'active devotion (depuis archives)
  useEffect(() => {
    if (!active.id) return;
    const sb = createClient();
    let mounted = true;
    (async () => {
      const [{ count: lc }, { count: cc }] = await Promise.all([
        sb.from("devotion_likes").select("id", { count: "exact", head: true }).eq("devotion_id", active.id),
        sb.from("devotion_comments").select("id", { count: "exact", head: true }).eq("devotion_id", active.id),
      ]);
      if (!mounted) return;
      setLikeCount(lc ?? 0);
      setCommentsCount(cc ?? 0);
      if (userId) {
        const { data } = await sb.from("devotion_likes").select("id")
          .eq("devotion_id", active.id).eq("user_id", userId).maybeSingle();
        if (mounted) setUserLiked(!!data);
      }
    })();
    return () => { mounted = false; };
  }, [active.id, userId]);

  const [likeError, setLikeError] = useState<string | null>(null);

  async function toggleLike() {
    if (!userId) { window.location.href = "/auth/login?redirect=/devotion"; return; }
    if (!active.id) { setLikeError("Cette méditation n'est pas encore enregistrée en base."); return; }
    const sb = createClient();
    setLikeError(null);
    // Optimistic update
    const prevLiked = userLiked;
    const prevCount = likeCount;
    if (userLiked) {
      setUserLiked(false); setLikeCount((c) => Math.max(0, c - 1));
      const { error } = await sb.from("devotion_likes").delete().eq("devotion_id", active.id).eq("user_id", userId);
      if (error) {
        // Rollback
        setUserLiked(prevLiked); setLikeCount(prevCount);
        setLikeError("Impossible de retirer le j'aime. Vérifiez que la table devotion_likes existe.");
      }
    } else {
      setUserLiked(true); setLikeCount((c) => c + 1);
      const { error } = await sb.from("devotion_likes").insert({ devotion_id: active.id, user_id: userId });
      if (error) {
        setUserLiked(prevLiked); setLikeCount(prevCount);
        setLikeError("Impossible de liker. La table devotion_likes n'existe pas encore en base.");
      }
    }
    if (likeError) setTimeout(() => setLikeError(null), 4000);
  }

  async function loadComments() {
    if (!active.id) return;
    const sb = createClient();
    const { data: cm } = await sb
      .from("devotion_comments")
      .select("id, user_id, content, created_at")
      .eq("devotion_id", active.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const userIds = [...new Set((cm ?? []).map((c) => c.user_id))];
    let profMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profs } = await sb.from("user_profiles")
        .select("user_id, display_name, full_name").in("user_id", userIds);
      profMap = Object.fromEntries(
        (profs ?? []).map((p) => [p.user_id, p.display_name || p.full_name || "Membre"]),
      );
    }
    setComments((cm ?? []).map((c) => ({
      id: c.id, user_id: c.user_id, content: c.content, created_at: c.created_at,
      display_name: profMap[c.user_id] || "Membre",
    })));
  }

  async function openComments() {
    setCommentsOpen(true);
    await loadComments();
  }

  const [commentError, setCommentError] = useState<string | null>(null);

  async function submitComment() {
    if (!userId) { window.location.href = "/auth/login?redirect=/devotion"; return; }
    if (!active.id || commentText.trim().length < 2) return;
    setPostingComment(true);
    setCommentError(null);
    const sb = createClient();
    const { error } = await sb.from("devotion_comments")
      .insert({ devotion_id: active.id, user_id: userId, content: commentText.trim() });
    if (!error) {
      setCommentText("");
      setCommentsCount((c) => c + 1);
      await loadComments();
    } else {
      setCommentError("Impossible de publier. La table devotion_comments n'existe pas encore en base.");
      setTimeout(() => setCommentError(null), 4000);
    }
    setPostingComment(false);
  }

  // Construit le texte partagé. `includeUrl` ajoute le lien CCB dans le texte
  // (utile pour le clipboard ; pas nécessaire pour navigator.share qui passe url séparément).
  function buildShareText(d: UnifiedDevotion, includeUrl: boolean) {
    const dateUpper = fmtDate(d.date).toUpperCase();
    const titleUpper = d.title.toUpperCase();
    const lines: string[] = [
      `☀ MÉDITONS ENSEMBLE — ${dateUpper}`,
      ``,
      `« ${titleUpper} »`,
      ``,
      `📖 ${d.verse_ref}`,
      `« ${d.verse_text} »`,
      ``,
      `✦ MÉDITATION`,
      d.content,
    ];
    if (d.application) { lines.push("", "💡 APPLICATION PRATIQUE", d.application); }
    if (d.prayer) { lines.push("", "🙏 PRIÈRE DU JOUR", d.prayer); }
    if (d.declaration) { lines.push("", "✦ DÉCLARATION DE FOI", d.declaration); }
    lines.push("", `— ${SIGNATURE}`);
    if (includeUrl) {
      lines.push("", "📱 Rejoignez le Centre Chrétien Berakah :");
      lines.push(PUBLIC_URL);
    }
    return lines.join("\n");
  }

  async function handleShare() {
    const title = `MÉDITONS ENSEMBLE — ${active.title}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        // navigator.share affiche déjà l'URL séparément — pas de duplication dans le texte
        await navigator.share({
          title,
          text: buildShareText(active, false),
          url: PUBLIC_URL,
        });
        return;
      }
    } catch { /* user cancelled */ }
    try {
      // Pour le presse-papier on inclut le lien dans le texte pour qu'il soit copié
      await navigator.clipboard.writeText(buildShareText(active, true));
      setShared(true);
      setTimeout(() => setShared(false), 2200);
    } catch { /* noop */ }
  }

  const isFromToday = active.date === today.date;
  const paragraphs = active.content.split("\n\n").filter((p) => p.trim().length > 0);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 80px" }}>

      {/* ─── Header centré façon Jesus Daily ─── */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>☀️</div>
        <h1 style={{
          fontSize: 28, fontWeight: 800,
          background: "linear-gradient(135deg, var(--gold), #f59e0b)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          margin: "0 0 6px", fontFamily: "var(--font-title)",
        }}>
          Méditons Ensemble
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          La méditation du jour pour nourrir ta foi
        </p>
        {streak > 0 && (
          <div style={{
            display: "inline-block", marginTop: 12,
            background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)",
            color: "var(--gold)", borderRadius: 9999,
            padding: "5px 14px", fontSize: 12, fontWeight: 700,
          }}>
            🔥 {streak} méditation{streak > 1 ? "s" : ""} lue{streak > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* ─── Carte principale (déroulable) ─── */}
      <div
        ref={articleRef}
        style={{
          background: "linear-gradient(135deg, rgba(212,175,55,0.10), rgba(245,158,11,0.06))",
          border: "1px solid rgba(212,175,55,0.30)",
          borderRadius: "var(--radius-xl)",
          padding: "28px 24px",
          marginBottom: 16,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -30, right: -30, fontSize: 140, opacity: 0.05, pointerEvents: "none" }}>☀️</div>

        {/* Métadonnées */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{
            background: "rgba(212,175,55,0.18)", border: "1px solid rgba(212,175,55,0.40)",
            color: "var(--gold)", borderRadius: 9999,
            padding: "3px 10px", fontSize: 11, fontWeight: 700,
          }}>
            📅 {fmtDate(active.date)}
          </span>
          {!isFromToday && (
            <span style={{
              background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.4)",
              color: "var(--violet-light, #a78bfa)", borderRadius: 9999,
              padding: "3px 10px", fontSize: 11, fontWeight: 700,
            }}>
              ◀ Méditation archivée
            </span>
          )}
        </div>

        <h2 style={{
          fontSize: 24, fontWeight: 800, color: "var(--text-primary)",
          margin: "0 0 14px", lineHeight: 1.25, fontFamily: "var(--font-title)",
        }}>
          {active.title}
        </h2>

        {/* Verset (toujours visible) */}
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "14px 16px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.1em", marginBottom: 6 }}>
            📖 {active.verse_ref}
          </div>
          <blockquote style={{
            fontSize: 15, fontStyle: "italic", color: "var(--text-primary)",
            lineHeight: 1.6, margin: 0,
          }}>
            « {active.verse_text} »
          </blockquote>
        </div>

        {/* Contenu déroulable */}
        {!expanded ? (
          <>
            <p style={{
              fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7,
              margin: "0 0 16px",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {paragraphs[0] || active.content}
            </p>
            <button
              onClick={() => setExpanded(true)}
              style={{
                width: "100%", background: "var(--gold)", color: "#1a0a00",
                border: "none", borderRadius: 9999, padding: "10px 18px",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >
              📖 Lire la méditation complète
            </button>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Méditation */}
            <section>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>
                ✦ Méditation
              </div>
              {paragraphs.map((p, i) => (
                <p key={i} style={{ fontSize: 15, color: "var(--text-primary)", lineHeight: 1.75, margin: "0 0 12px" }}>
                  {p}
                </p>
              ))}
            </section>

            {/* Application */}
            {active.application && (
              <section style={{
                background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)",
                borderRadius: 12, padding: "14px 16px",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--violet-light, #a78bfa)", letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" }}>
                  💡 Application pratique
                </div>
                <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.65, margin: 0 }}>
                  {active.application}
                </p>
              </section>
            )}

            {/* Prière */}
            {active.prayer && (
              <section style={{
                background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: 12, padding: "14px 16px",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" }}>
                  🙏 Prière du jour
                </div>
                <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>
                  {active.prayer}
                </p>
              </section>
            )}

            {/* Déclaration */}
            {active.declaration && (
              <section style={{
                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 12, padding: "14px 16px", textAlign: "center",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" }}>
                  ✦ Déclaration de foi
                </div>
                <p style={{ fontSize: 15, color: "var(--text-primary)", lineHeight: 1.6, margin: 0, fontWeight: 600 }}>
                  « {active.declaration} »
                </p>
              </section>
            )}

            {/* Signature */}
            <div style={{ textAlign: "right", marginTop: 8 }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, fontStyle: "italic" }}>
                — {SIGNATURE}
              </p>
            </div>

            <button
              onClick={() => { setExpanded(false); articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              style={{
                alignSelf: "center",
                background: "transparent", color: "var(--text-muted)",
                border: "1px solid var(--border)", borderRadius: 9999, padding: "7px 16px",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              ▲ Réduire
            </button>
          </div>
        )}
      </div>

      {/* ─── Erreurs ─── */}
      {(likeError || commentError) && (
        <div style={{
          padding: "8px 12px", marginBottom: 12,
          background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
          borderRadius: 10, color: "#fca5a5", fontSize: 12,
        }}>
          ⚠ {likeError || commentError}
        </div>
      )}

      {/* ─── Actions : Like, Comment, Share ─── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        <button
          onClick={toggleLike}
          style={{
            flex: 1,
            background: userLiked ? "rgba(248,113,113,0.15)" : "var(--card-bg)",
            border: `1px solid ${userLiked ? "rgba(248,113,113,0.4)" : "var(--border)"}`,
            borderRadius: 9999, padding: "10px 14px",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
            color: userLiked ? "#fca5a5" : "var(--text-primary)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          {userLiked ? "❤️" : "🤍"} {likeCount}
        </button>
        <button
          onClick={openComments}
          style={{
            flex: 1,
            background: "var(--card-bg)", border: "1px solid var(--border)",
            borderRadius: 9999, padding: "10px 14px",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
            color: "var(--text-primary)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          💬 {commentsCount}
        </button>
        <button
          onClick={handleShare}
          style={{
            flex: 1,
            background: "var(--gold)", border: "none",
            borderRadius: 9999, padding: "10px 14px",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
            color: "#1a0a00",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          {shared ? "✅ Copié !" : "📤 Partager"}
        </button>
      </div>

      {/* ─── Commentaires (drawer) ─── */}
      {commentsOpen && (
        <div style={{
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: 16, padding: 16, marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>💬 Commentaires ({commentsCount})</h3>
            <button onClick={() => setCommentsOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>

          {userId ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Partage ta réflexion..."
                maxLength={1000}
                rows={2}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 10,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", fontFamily: "inherit", fontSize: 13,
                  resize: "vertical", outline: "none",
                }}
              />
              <button
                onClick={submitComment}
                disabled={postingComment || commentText.trim().length < 2}
                style={{
                  background: "var(--gold)", color: "#1a0a00", border: "none",
                  borderRadius: 10, padding: "0 16px", fontWeight: 700, fontSize: 13,
                  cursor: "pointer", opacity: postingComment ? 0.5 : 1, whiteSpace: "nowrap",
                }}
              >
                {postingComment ? "..." : "Envoyer"}
              </button>
            </div>
          ) : (
            <Link href="/auth/login?redirect=/devotion" style={{
              display: "block", textAlign: "center", padding: "8px",
              background: "rgba(212,175,55,0.1)", borderRadius: 8,
              color: "var(--gold)", fontSize: 12, fontWeight: 700,
              textDecoration: "none", marginBottom: 12,
            }}>
              Connecte-toi pour commenter →
            </Link>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto" }}>
            {comments.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", fontSize: 12, padding: "16px 0", margin: 0 }}>
                Aucun commentaire pour l&apos;instant. Sois le premier !
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} style={{ padding: "8px 12px", background: "var(--surface)", borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 4 }}>{c.display_name}</div>
                  <p style={{ fontSize: 13, color: "var(--text-primary)", margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── Archives 30 jours ─── */}
      {archives.length > 0 && (
        <>
          <h2 style={{
            fontSize: 13, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: 1,
            marginBottom: 14, marginTop: 12,
          }}>
            📅 Méditations récentes
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {archives.map((d) => {
              const isActive = d.id === active.id;
              return (
                <button
                  key={d.id ?? d.date}
                  onClick={() => { setActive(d); setExpanded(false); setCommentsOpen(false); articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  style={{
                    display: "flex", gap: 14, alignItems: "center", textAlign: "left",
                    background: isActive ? "rgba(212,175,55,0.10)" : "var(--card-bg)",
                    border: `1px solid ${isActive ? "rgba(212,175,55,0.4)" : "var(--border)"}`,
                    borderRadius: "var(--radius-xl)", padding: "12px 16px",
                    cursor: "pointer", width: "100%",
                  }}
                >
                  <div style={{
                    background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)",
                    borderRadius: 10, padding: "6px 10px",
                    fontSize: 11, fontWeight: 700, color: "var(--gold)",
                    flexShrink: 0, whiteSpace: "nowrap",
                  }}>
                    {fmtShortDate(d.date)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>📖 {d.verse_ref}</div>
                  </div>
                  {isActive && <span style={{ color: "var(--gold)", fontSize: 16, flexShrink: 0 }}>▶</span>}
                </button>
              );
            })}
          </div>
        </>
      )}

    </div>
  );
}
