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
  likeCount: number;
  liked: boolean;
}

// Helper : envoie une notification au staff (owner/admin/moderator/leader)
async function notifyAdmins(title: string, body: string, url = "/devotion") {
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, url, audience: "admins" }),
    });
  } catch { /* silencieux — notif facultative */ }
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
  const [currentUserName, setCurrentUserName] = useState<string>("Un membre");
  const articleRef = useRef<HTMLDivElement>(null);

  // Récupère le display_name du user courant pour personnaliser les notifs admin
  useEffect(() => {
    if (!userId) return;
    const sb = createClient();
    sb.from("user_profiles")
      .select("display_name, full_name")
      .eq("user_id", userId).maybeSingle()
      .then(({ data }) => {
        if (data) setCurrentUserName(data.display_name || data.full_name || "Un membre");
      });
  }, [userId]);

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
  const [ensuring, setEnsuring] = useState(false);
  // Dernier message d'erreur retourné par l'API ensure (pour diagnostic)
  const ensureErrRef = useRef<string | null>(null);

  // Garantit que la méditation active a un ID réel en base. Si elle vient
  // du fallback statique (id null), on l'enregistre via /api/devotion/ensure
  // et on met à jour le state local avec le vrai UUID. Renvoie l'id ou null.
  async function ensureDevotionId(): Promise<string | null> {
    if (active.id) return active.id;
    setEnsuring(true);
    ensureErrRef.current = null;
    try {
      const res = await fetch("/api/devotion/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: active.date,
          title: active.title,
          verse_ref: active.verse_ref,
          verse_text: active.verse_text,
          content: active.content,
          application: active.application,
          prayer: active.prayer,
          declaration: active.declaration,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (typeof window !== "undefined") {
        // JSON.stringify pour que l'objet soit lisible directement dans la
        // console (sinon affiché replié comme "Object")
        console.log("[CCB devotion] ensure →", res.status, JSON.stringify(data));
      }
      if (!res.ok || !data.id) {
        const base = (data && data.error) ? String(data.error) : `HTTP ${res.status}`;
        const att = (data && Array.isArray(data.attempts) && data.attempts.length)
          ? " — détails: " + data.attempts.join(" | ")
          : "";
        ensureErrRef.current = base + att;
        return null;
      }
      // Met à jour le state local avec le vrai UUID
      setActive((prev) => ({ ...prev, id: data.id as string }));
      return data.id as string;
    } catch (e) {
      ensureErrRef.current = (e as Error)?.message || "réseau";
      return null;
    } finally {
      setEnsuring(false);
    }
  }

  async function toggleLike() {
    if (!userId) { window.location.href = "/auth/login?redirect=/devotion"; return; }
    setLikeError(null);
    // Si la méditation n'a pas d'ID réel (fallback statique), on l'enregistre
    // d'abord en base via l'API, puis on continue.
    let devotionId = active.id;
    if (!devotionId) {
      devotionId = await ensureDevotionId();
      if (!devotionId) {
        setLikeError("Enregistrement impossible : " + (ensureErrRef.current || "réessaie dans un instant"));
        setTimeout(() => setLikeError(null), 8000);
        return;
      }
    }
    const sb = createClient();
    // Optimistic update
    const prevLiked = userLiked;
    const prevCount = likeCount;
    if (userLiked) {
      setUserLiked(false); setLikeCount((c) => Math.max(0, c - 1));
      const { error } = await sb.from("devotion_likes").delete().eq("devotion_id", devotionId).eq("user_id", userId);
      if (error) {
        // Rollback
        setUserLiked(prevLiked); setLikeCount(prevCount);
        setLikeError("Impossible de retirer le j'aime. Vérifiez que la table devotion_likes existe.");
        setTimeout(() => setLikeError(null), 4000);
      }
    } else {
      setUserLiked(true); setLikeCount((c) => c + 1);
      const { error } = await sb.from("devotion_likes").insert({ devotion_id: devotionId, user_id: userId });
      if (error) {
        setUserLiked(prevLiked); setLikeCount(prevCount);
        setLikeError("Impossible de liker. La table devotion_likes n'existe pas encore en base.");
        setTimeout(() => setLikeError(null), 4000);
      } else {
        // Notifie le staff
        notifyAdmins(
          `❤️ ${currentUserName} a liké une méditation`,
          `« ${active.title} »`,
        );
      }
    }
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
    const list = (cm ?? []) as { id: string; user_id: string; content: string; created_at: string }[];
    const userIds = [...new Set(list.map((c) => c.user_id))];
    const commentIds = list.map((c) => c.id);
    let profMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profs } = await sb.from("user_profiles")
        .select("user_id, display_name, full_name").in("user_id", userIds);
      profMap = Object.fromEntries(
        (profs ?? []).map((p) => [p.user_id, p.display_name || p.full_name || "Membre"]),
      );
    }
    // Likes par commentaire
    const likeCounts: Record<string, number> = {};
    const userLikedSet = new Set<string>();
    if (commentIds.length > 0) {
      const { data: cl } = await sb.from("devotion_comment_likes")
        .select("comment_id, user_id").in("comment_id", commentIds);
      for (const row of (cl ?? []) as { comment_id: string; user_id: string }[]) {
        likeCounts[row.comment_id] = (likeCounts[row.comment_id] || 0) + 1;
        if (userId && row.user_id === userId) userLikedSet.add(row.comment_id);
      }
    }
    setComments(list.map((c) => ({
      id: c.id, user_id: c.user_id, content: c.content, created_at: c.created_at,
      display_name: profMap[c.user_id] || "Membre",
      likeCount: likeCounts[c.id] || 0,
      liked: userLikedSet.has(c.id),
    })));
  }

  async function toggleCommentLike(commentId: string) {
    if (!userId) { window.location.href = "/auth/login?redirect=/devotion"; return; }
    const sb = createClient();
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;
    // Optimistic update
    setComments((prev) => prev.map((c) =>
      c.id === commentId
        ? { ...c, liked: !c.liked, likeCount: c.likeCount + (c.liked ? -1 : 1) }
        : c,
    ));
    if (target.liked) {
      const { error } = await sb.from("devotion_comment_likes")
        .delete().eq("comment_id", commentId).eq("user_id", userId);
      if (error) {
        // Rollback
        setComments((prev) => prev.map((c) =>
          c.id === commentId ? { ...c, liked: true, likeCount: c.likeCount + 1 } : c,
        ));
      }
    } else {
      const { error } = await sb.from("devotion_comment_likes")
        .insert({ comment_id: commentId, user_id: userId });
      if (error) {
        setComments((prev) => prev.map((c) =>
          c.id === commentId ? { ...c, liked: false, likeCount: Math.max(0, c.likeCount - 1) } : c,
        ));
      }
    }
  }

  async function openComments() {
    setCommentsOpen(true);
    await loadComments();
  }

  const [commentError, setCommentError] = useState<string | null>(null);

  async function submitComment() {
    if (!userId) { window.location.href = "/auth/login?redirect=/devotion"; return; }
    if (commentText.trim().length < 2) return;
    setPostingComment(true);
    setCommentError(null);
    // Garantit un ID réel (enregistre la méditation si fallback statique)
    let devotionId = active.id;
    if (!devotionId) {
      devotionId = await ensureDevotionId();
      if (!devotionId) {
        setCommentError("Impossible d'enregistrer la méditation pour le moment. Réessaie dans un instant.");
        setTimeout(() => setCommentError(null), 4000);
        setPostingComment(false);
        return;
      }
    }
    const sb = createClient();
    const { error } = await sb.from("devotion_comments")
      .insert({ devotion_id: devotionId, user_id: userId, content: commentText.trim() });
    if (!error) {
      const text = commentText.trim();
      setCommentText("");
      setCommentsCount((c) => c + 1);
      await loadComments();
      // Notifie le staff
      notifyAdmins(
        `💬 ${currentUserName} a commenté une méditation`,
        text.length > 100 ? text.slice(0, 97) + "…" : text,
      );
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
    let didShare = false;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title,
          text: buildShareText(active, false),
          url: PUBLIC_URL,
        });
        didShare = true;
      }
    } catch { /* user cancelled */ }
    if (!didShare) {
      try {
        await navigator.clipboard.writeText(buildShareText(active, true));
        setShared(true);
        didShare = true;
        setTimeout(() => setShared(false), 2200);
      } catch { /* noop */ }
    }
    if (didShare && userId) {
      notifyAdmins(
        `📤 ${currentUserName} a partagé une méditation`,
        `« ${active.title} »`,
      );
    }
  }

  const isFromToday = active.date === today.date;
  const paragraphs = active.content.split("\n\n").filter((p) => p.trim().length > 0);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 80px" }}>

      {/* ─── Header centré façon Jesus Daily TV ─── */}
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
          disabled={ensuring}
          style={{
            flex: 1,
            background: userLiked ? "rgba(248,113,113,0.15)" : "var(--card-bg)",
            border: `1px solid ${userLiked ? "rgba(248,113,113,0.4)" : "var(--border)"}`,
            borderRadius: 9999, padding: "10px 14px",
            fontWeight: 700, fontSize: 13, cursor: ensuring ? "wait" : "pointer",
            color: userLiked ? "#fca5a5" : "var(--text-primary)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            opacity: ensuring ? 0.6 : 1,
          }}
        >
          {ensuring ? "⏳" : (userLiked ? "❤️" : "🤍")} {likeCount}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{c.display_name}</div>
                    <button
                      onClick={() => toggleCommentLike(c.id)}
                      style={{
                        background: "transparent", border: "none",
                        color: c.liked ? "#fca5a5" : "var(--text-muted)",
                        cursor: "pointer", fontSize: 12, fontWeight: 700,
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "2px 6px", borderRadius: 9999,
                      }}
                    >
                      {c.liked ? "❤️" : "🤍"} {c.likeCount > 0 ? c.likeCount : ""}
                    </button>
                  </div>
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
