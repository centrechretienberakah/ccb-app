"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { JDTV_THEME as T, JDTV_FONTS as F, relativeDate } from "@/lib/jdtv/theme";

export interface CommentItem {
  id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  like_count: number;
  is_pinned: boolean;
  created_at: string;
  user_display_name: string | null;
  user_avatar_url: string | null;
}

interface Props {
  videoId: string;
  initialComments: CommentItem[];
  initialLikedIds: string[];
  currentUserId: string | null;
  isAuth: boolean;
  isStaff: boolean;
}

export default function CommentsSection({
  videoId, initialComments, initialLikedIds, currentUserId, isAuth, isStaff,
}: Props) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set(initialLikedIds));
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);

  // Group by thread (root + children)
  const { roots, repliesMap } = useMemo(() => {
    const rootList: CommentItem[] = [];
    const map = new Map<string, CommentItem[]>();
    [...comments].forEach((c) => {
      if (c.parent_id) {
        if (!map.has(c.parent_id)) map.set(c.parent_id, []);
        map.get(c.parent_id)!.push(c);
      } else {
        rootList.push(c);
      }
    });
    rootList.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    map.forEach((arr) => arr.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ));
    return { roots: rootList, repliesMap: map };
  }, [comments]);

  useEffect(() => {
    // Realtime subscribe to new comments
    const supabase = createClient();
    const channel = supabase
      .channel(`jdtv-comments-${videoId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "jdtv_comments",
        filter: `video_id=eq.${videoId}`,
      }, async (payload) => {
        const row = payload.new as Omit<CommentItem, "user_display_name" | "user_avatar_url">;
        if (comments.some((c) => c.id === row.id)) return;
        // fetch profile
        const { data: prof } = await supabase
          .from("user_profiles").select("display_name, avatar_url").eq("user_id", row.user_id).maybeSingle();
        const p = (prof ?? null) as { display_name: string | null; avatar_url: string | null } | null;
        const enriched: CommentItem = {
          id: row.id, user_id: row.user_id, parent_id: row.parent_id,
          body: row.body, like_count: row.like_count, is_pinned: row.is_pinned,
          created_at: row.created_at,
          user_display_name: p?.display_name ?? null,
          user_avatar_url: p?.avatar_url ?? null,
        };
        setComments((arr) => arr.some((c) => c.id === enriched.id) ? arr : [enriched, ...arr]);
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "jdtv_comments",
        filter: `video_id=eq.${videoId}`,
      }, (payload) => {
        const id = (payload.old as { id: string }).id;
        setComments((arr) => arr.filter((c) => c.id !== id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [videoId, comments]);

  async function postComment() {
    if (busy) return;
    if (!body.trim()) return;
    if (!isAuth) { router.push(`/auth/login?redirect=/jesus-daily/video/`); return; }
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const { data, error } = await supabase.from("jdtv_comments")
      .insert({ video_id: videoId, user_id: user.id, body: body.trim(), parent_id: replyTo?.id ?? null })
      .select().single();
    setBusy(false);
    if (error) { alert("Erreur : " + error.message); return; }
    // Optimistic add (Realtime might also add — dedup is in place)
    const { data: prof } = await supabase
      .from("user_profiles").select("display_name, avatar_url").eq("user_id", user.id).maybeSingle();
    const p = (prof ?? null) as { display_name: string | null; avatar_url: string | null } | null;
    const inserted = data as Omit<CommentItem, "user_display_name" | "user_avatar_url">;
    const enriched: CommentItem = {
      id: inserted.id, user_id: inserted.user_id, parent_id: inserted.parent_id,
      body: inserted.body, like_count: inserted.like_count, is_pinned: inserted.is_pinned,
      created_at: inserted.created_at,
      user_display_name: p?.display_name ?? null,
      user_avatar_url: p?.avatar_url ?? null,
    };
    setComments((arr) => arr.some((c) => c.id === enriched.id) ? arr : [enriched, ...arr]);
    setBody("");
    setReplyTo(null);
  }

  async function toggleLike(c: CommentItem) {
    if (!isAuth) { router.push(`/auth/login?redirect=/jesus-daily/video/`); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (likedIds.has(c.id)) {
      await supabase.from("jdtv_comment_likes").delete().eq("comment_id", c.id).eq("user_id", user.id);
      const next = new Set(likedIds);
      next.delete(c.id);
      setLikedIds(next);
      setComments((arr) => arr.map((x) => x.id === c.id ? { ...x, like_count: Math.max(0, x.like_count - 1) } : x));
    } else {
      await supabase.from("jdtv_comment_likes").insert({ comment_id: c.id, user_id: user.id });
      const next = new Set(likedIds);
      next.add(c.id);
      setLikedIds(next);
      setComments((arr) => arr.map((x) => x.id === c.id ? { ...x, like_count: x.like_count + 1 } : x));
    }
  }

  async function deleteComment(c: CommentItem) {
    if (!confirm("Supprimer ce commentaire ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("jdtv_comments").delete().eq("id", c.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setComments((arr) => arr.filter((x) => x.id !== c.id && x.parent_id !== c.id));
  }

  async function togglePin(c: CommentItem) {
    const supabase = createClient();
    const { error } = await supabase.from("jdtv_comments").update({ is_pinned: !c.is_pinned }).eq("id", c.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setComments((arr) => arr.map((x) => x.id === c.id ? { ...x, is_pinned: !c.is_pinned } : x));
  }

  return (
    <section style={{ marginTop: 36 }}>
      <h2 style={{ fontFamily: F.title, fontSize: 22, margin: "0 0 14px" }}>
        💬 Commentaires <span style={{ color: T.textMuted, fontSize: 14, fontWeight: 400 }}>({comments.length})</span>
      </h2>

      {/* Composer */}
      <div style={{ padding: 14, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, marginBottom: 22 }}>
        {replyTo ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px",
            background: T.violetSoft, border: `1px solid ${T.violet}`, borderRadius: 999,
            fontSize: 12, marginBottom: 8,
          }}>
            ↳ Réponse à {replyTo.user_display_name ?? "anonyme"}
            <button onClick={() => setReplyTo(null)} style={{
              background: "transparent", border: "none", color: T.text, cursor: "pointer", fontSize: 14,
            }}>×</button>
          </div>
        ) : null}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={isAuth ? "Partage ce que Dieu te révèle..." : "Connecte-toi pour commenter"}
          rows={3}
          maxLength={4000}
          disabled={!isAuth}
          style={{
            width: "100%", padding: "10px 12px",
            background: T.surface2, color: T.text, border: `1px solid ${T.border}`,
            borderRadius: 8, fontSize: 14, fontFamily: F.body, resize: "vertical", minHeight: 70,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 8 }}>
          <span style={{ fontSize: 11, color: T.textMuted }}>{body.length}/4000</span>
          {isAuth ? (
            <button onClick={postComment} disabled={busy || !body.trim()}
              style={{
                padding: "8px 18px", background: T.violet, color: "#fff", border: "none",
                borderRadius: 8, fontWeight: 700, fontSize: 13,
                cursor: busy || !body.trim() ? "not-allowed" : "pointer",
                opacity: busy || !body.trim() ? 0.5 : 1,
              }}>
              {busy ? "Envoi..." : "Publier"}
            </button>
          ) : (
            <Link href="/auth/login" style={{
              padding: "8px 18px", background: T.violet, color: "#fff",
              borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: "none",
            }}>Se connecter</Link>
          )}
        </div>
      </div>

      {/* List */}
      {roots.length === 0 ? (
        <div style={{
          padding: 30, textAlign: "center", color: T.textMuted, fontSize: 14,
          background: T.card, border: `1px dashed ${T.border}`, borderRadius: 12,
        }}>
          Sois le premier à commenter 🙏
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {roots.map((c) => (
            <div key={c.id}>
              <CommentCard
                comment={c}
                isLiked={likedIds.has(c.id)}
                isOwner={c.user_id === currentUserId}
                isStaff={isStaff}
                onLike={() => toggleLike(c)}
                onReply={() => setReplyTo(c)}
                onDelete={() => deleteComment(c)}
                onPin={() => togglePin(c)}
              />
              {(repliesMap.get(c.id) ?? []).length > 0 ? (
                <div style={{ marginLeft: 44, marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  {(repliesMap.get(c.id) ?? []).map((r) => (
                    <CommentCard key={r.id}
                      comment={r}
                      isLiked={likedIds.has(r.id)}
                      isOwner={r.user_id === currentUserId}
                      isStaff={isStaff}
                      compact
                      onLike={() => toggleLike(r)}
                      onReply={() => setReplyTo(c)}
                      onDelete={() => deleteComment(r)}
                      onPin={() => togglePin(r)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CommentCard({
  comment, isLiked, isOwner, isStaff, compact = false,
  onLike, onReply, onDelete, onPin,
}: {
  comment: CommentItem; isLiked: boolean; isOwner: boolean; isStaff: boolean; compact?: boolean;
  onLike: () => void; onReply: () => void; onDelete: () => void; onPin: () => void;
}) {
  const name = comment.user_display_name ?? "Anonyme";
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      display: "flex", gap: 12,
      padding: compact ? 10 : 14,
      background: comment.is_pinned ? `linear-gradient(135deg, ${T.violetSoft}, transparent)` : T.card,
      border: `1px solid ${comment.is_pinned ? T.violet : T.border}`, borderRadius: 12,
    }}>
      <div style={{
        flex: "0 0 36px", width: 36, height: 36, borderRadius: 999,
        background: T.violet, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 13, overflow: "hidden",
      }}>
        {comment.user_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={comment.user_avatar_url} alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : initials || "?"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{name}</span>
          <span style={{ fontSize: 11, color: T.textMuted }}>· {relativeDate(comment.created_at)}</span>
          {comment.is_pinned ? (
            <span style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 4,
              background: T.violet, color: "#fff", fontWeight: 700,
            }}>📌 Épinglé</span>
          ) : null}
        </div>
        <div style={{
          color: T.textSoft, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>{comment.body}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "center" }}>
          <button onClick={onLike} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "transparent", color: isLiked ? T.violet : T.textMuted,
            border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}>
            {isLiked ? "💜" : "🤍"} {comment.like_count > 0 ? comment.like_count : ""}
          </button>
          {!compact ? (
            <button onClick={onReply} style={{
              background: "transparent", color: T.textMuted,
              border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>↳ Répondre</button>
          ) : null}
          {isStaff && !compact ? (
            <button onClick={onPin} style={{
              background: "transparent", color: T.textMuted,
              border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>{comment.is_pinned ? "📌 Désépingler" : "📌 Épingler"}</button>
          ) : null}
          {(isOwner || isStaff) ? (
            <button onClick={onDelete} style={{
              background: "transparent", color: "#ff5470",
              border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, marginLeft: "auto",
            }}>🗑️</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
