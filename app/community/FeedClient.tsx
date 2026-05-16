"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { POST_KINDS, getPostKindDef, notifyCommunityStaff, type PostKind } from "@/lib/community/theme";
import { getMentionedUserIds, renderSegments, type MemberLookup } from "@/lib/community/mentions";
import MentionTextarea from "@/components/community/MentionTextarea";
import Link from "next/link";

// ─── Cache window (client uniquement) ───────────────────────────────────────
interface FeedCache { posts: Post[]; likedIds: Set<string>; votes: Record<string, number> }
function getClientCache(): FeedCache | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { __ccbFeedCache?: FeedCache };
  if (!w.__ccbFeedCache) {
    w.__ccbFeedCache = { posts: [] as Post[], likedIds: new Set<string>(), votes: {} };
  }
  return w.__ccbFeedCache;
}

// ─── Types ───────────────────────────────────────────────────
export interface Category { id: string; name: string; icon: string; color: string; }
export interface Post {
  id: string; user_id: string; category_id: string | null;
  post_type: "text" | "image" | "video" | "audio" | "pdf" | "link" | "poll" | "quiz";
  post_kind?: PostKind | null;
  title?: string | null;
  content: string; media_url?: string;
  audio_url?: string | null; pdf_url?: string | null;
  link_url?: string;
  link_title?: string; link_description?: string;
  poll_options?: { text: string; correct?: boolean }[];
  is_pinned: boolean; created_at: string;
  user_profiles?: { display_name?: string | null; avatar_url?: string | null } | null;
  post_categories?: { name: string; icon: string; color: string };
  likeCount: number;
  comments: Comment[];
  voteResults: number[];
  bookmarked?: boolean;
}
interface Comment {
  id: string; user_id: string; content: string; created_at: string;
  parent_comment_id?: string | null;
  likeCount?: number;
  liked?: boolean;
  user_profiles?: { display_name?: string | null; avatar_url?: string | null } | null;
}
export interface CurrentUserProfile {
  display_name?: string | null;
  avatar_url?: string | null;
}
interface PollOption { text: string; correct?: boolean }

const POST_TYPES = [
  { key: "text",  icon: "✍️", label: "Texte" },
  { key: "image", icon: "🖼️", label: "Image" },
  { key: "video", icon: "▶️", label: "Vidéo" },
  { key: "audio", icon: "🎵", label: "Audio" },
  { key: "pdf",   icon: "📄", label: "PDF" },
  { key: "link",  icon: "🔗", label: "Lien" },
  { key: "poll",  icon: "📊", label: "Sondage" },
  { key: "quiz",  icon: "🧠", label: "Quiz" },
];

function timeAgo(dateStr: string) {
  const d = new Date(dateStr); const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function getYoutubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?/\s]{11})/);
  return m ? m[1] : null;
}

function Avatar({ profile, size = 40 }: { profile?: { display_name?: string | null; avatar_url?: string | null } | null; size?: number }) {
  const name = profile?.display_name || "?";
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  if (profile?.avatar_url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={profile.avatar_url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, var(--gold-dark), var(--gold))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "#000", flexShrink: 0 }}>{initials}</div>
  );
}

// Shared input style constant
const inputStyle: React.CSSProperties = {
  background: "var(--input-bg, var(--page-bg))",
  border: "1px solid var(--input-border, var(--border))",
  borderRadius: "var(--radius-md)",
  padding: "10px 14px",
  color: "var(--text-primary)",
  fontSize: 13,
  boxSizing: "border-box",
  fontFamily: "inherit",
};

// ─── Helper : crée des notifs in-app + push pour mentions ─────────
async function createMentionNotifications(args: {
  mentionedIds: string[];
  actorId: string;
  actorName: string;
  sourceType: "post" | "comment";
  sourceId: string;
  excerpt: string;
}) {
  if (args.mentionedIds.length === 0) return;
  const supabase = createClient();
  const rows = args.mentionedIds
    .filter((uid) => uid !== args.actorId) // pas d'auto-notification
    .map((uid) => ({
      user_id: uid,
      actor_id: args.actorId,
      type: args.sourceType === "post" ? "mention_post" : "mention_comment",
      source_type: args.sourceType,
      source_id: args.sourceId,
      payload: { actor_name: args.actorName, excerpt: args.excerpt.slice(0, 200) },
    }));
  if (rows.length === 0) return;
  await supabase.from("user_notifications").insert(rows);

  // Push aussi pour chaque mentionné (audience: user_ids)
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `🔔 ${args.actorName} t'a mentionné`,
        body: args.excerpt.slice(0, 140),
        url: "/community/notifications",
        audience: "user_ids",
        userIds: rows.map((r) => r.user_id),
      }),
    });
  } catch { /* noop */ }
}

// ─── PostCreator ─────────────────────────────────────────────
function PostCreator({ categories, currentUserProfile, currentUserId, members, onPostCreated }: {
  categories: Category[]; currentUserProfile: CurrentUserProfile | null; currentUserId: string;
  members: MemberLookup[];
  onPostCreated: (post: Post) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("text");
  const [kind, setKind] = useState<PostKind>("discussion");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkDesc, setLinkDesc] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [quizOptions, setQuizOptions] = useState([{ text: "", correct: false }, { text: "", correct: false }]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File, kind: "image" | "audio" | "pdf"): Promise<string | null> {
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${currentUserId}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("posts").upload(path, file);
    if (upErr) { setError("Erreur upload : " + upErr.message); setUploading(false); return null; }
    const { data } = supabase.storage.from("posts").getPublicUrl(path);
    setUploading(false);
    return data.publicUrl;
  }
  async function uploadImage(file: File) {
    const url = await uploadFile(file, "image");
    if (url) setMediaUrl(url);
  }
  async function uploadAudio(file: File) {
    const url = await uploadFile(file, "audio");
    if (url) setAudioUrl(url);
  }
  async function uploadPdf(file: File) {
    const url = await uploadFile(file, "pdf");
    if (url) setPdfUrl(url);
  }

  async function submit() {
    if (!content.trim()) { setError("Le texte du post est requis."); return; }
    if (!categoryId) { setError("Veuillez sélectionner une catégorie avant de publier."); return; }
    setSaving(true); setError("");
    const supabase = createClient();
    let pollData: PollOption[] | null = null;
    if (type === "poll") pollData = pollOptions.filter(Boolean).map((t) => ({ text: t }));
    if (type === "quiz") pollData = quizOptions.filter((o) => o.text).map((o) => ({ text: o.text, correct: o.correct }));

    const { data, error: e } = await supabase.from("posts").insert({
      user_id: currentUserId, category_id: categoryId || null,
      post_type: type, post_kind: kind,
      title: title.trim() || null,
      content,
      media_url: mediaUrl || null,
      audio_url: audioUrl || null,
      pdf_url: pdfUrl || null,
      link_url: linkUrl || null, link_title: linkTitle || null, link_description: linkDesc || null,
      poll_options: pollData,
    }).select(`id, user_id, category_id, post_type, post_kind, title, content, media_url, audio_url, pdf_url, link_url, link_title, link_description, poll_options, is_pinned, created_at, post_categories(name, icon, color)`).single();

    if (e) { setError(e.message); setSaving(false); return; }
    const userProfilesForPost = currentUserProfile
      ? { display_name: currentUserProfile.display_name ?? "Membre", avatar_url: currentUserProfile.avatar_url ?? undefined }
      : undefined;
    onPostCreated({ ...(data as unknown as Post), user_profiles: userProfilesForPost, likeCount: 0, comments: [], voteResults: [] });
    // Notif staff
    const kindDef = getPostKindDef(kind);
    const author = currentUserProfile?.display_name || "Un membre";
    notifyCommunityStaff(
      `${kindDef.emoji} ${author} a publié : ${kindDef.label}`,
      content.slice(0, 120),
      "/community",
    );
    // Notif mentions
    const mentionedIds = getMentionedUserIds(content, members);
    if (mentionedIds.length > 0) {
      const postId = (data as unknown as { id: string }).id;
      createMentionNotifications({
        mentionedIds, actorId: currentUserId, actorName: author,
        sourceType: "post", sourceId: postId, excerpt: content,
      });
    }
    setOpen(false); setTitle(""); setContent(""); setType("text"); setKind("discussion"); setMediaUrl(""); setAudioUrl(""); setPdfUrl(""); setLinkUrl(""); setLinkTitle(""); setLinkDesc(""); setPollOptions(["",""]); setQuizOptions([{text:"",correct:false},{text:"",correct:false}]); setCategoryId("");
    setSaving(false);
  }

  if (!open) return (
    <div onClick={() => setOpen(true)} style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 16 }}>
      <Avatar profile={currentUserProfile} size={36} />
      <div style={{ flex: 1, color: "var(--text-muted)", fontSize: 14 }}>Partager quelque chose avec la communauté...</div>
      <span style={{ fontSize: 18 }}>✍️</span>
    </div>
  );

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 16 }}>
      {/* Top row : Type de publication + Catégorie côte à côte */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, letterSpacing: 0.4 }}>
            TYPE DE PUBLICATION
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px", boxSizing: "border-box",
              background: "var(--card-bg)", border: "1px solid var(--border)",
              borderRadius: 10, color: "var(--text-primary)",
              fontSize: 14, cursor: "pointer", fontFamily: "inherit", outline: "none",
            }}>
            {POST_TYPES.map((pt) => (
              <option key={pt.key} value={pt.key}>{pt.icon} {pt.label}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{
            fontSize: 11, fontWeight: 600,
            color: categoryId ? "var(--text-muted)" : "var(--error)",
            marginBottom: 6, letterSpacing: 0.4,
          }}>
            CATÉGORIE <span style={{ color: "var(--error)" }}>*</span>
          </div>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px", boxSizing: "border-box",
              background: "var(--card-bg)",
              border: `1px solid ${categoryId ? "var(--border)" : "var(--error)"}`,
              borderRadius: 10, color: "var(--text-primary)",
              fontSize: 14, cursor: "pointer", fontFamily: "inherit", outline: "none",
            }}>
            <option value="">— Choisir une catégorie —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Titre de la publication (en gras) */}
      <input
        type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre de la publication"
        maxLength={140}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "11px 14px", marginBottom: 10,
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: 10, color: "var(--text-primary)",
          fontSize: 16, fontWeight: 700, fontFamily: "inherit", outline: "none",
        }}
      />

      {/* Contenu texte avec @mention autocomplete */}
      <MentionTextarea
        value={content} onChange={setContent}
        members={members}
        placeholder={type === "poll" ? "Question du sondage..." : type === "quiz" ? "Question du quiz..." : "Exprimez-vous... (tapez @ pour mentionner un membre)"}
        rows={3}
        style={{ ...inputStyle, width: "100%", resize: "vertical" } as React.CSSProperties}
      />

      {/* Champs spécifiques par type */}
      {type === "image" && (
        <div style={{ marginTop: 10 }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
          {mediaUrl ? (
            <div style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl} alt="Aperçu média" style={{ width: "100%", borderRadius: "var(--radius-md)", maxHeight: 300, objectFit: "cover" }} />
              <button onClick={() => setMediaUrl("")} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} style={{ width: "100%", background: "var(--page-bg)", border: "2px dashed var(--border)", borderRadius: "var(--radius-md)", padding: "20px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
              {uploading ? "⏳ Chargement..." : "🖼️ Cliquer pour ajouter une image"}
            </button>
          )}
        </div>
      )}

      {type === "video" && (
        <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)}
          placeholder="URL YouTube ou Vimeo (ex: https://youtube.com/watch?v=...)"
          style={{ ...inputStyle, width: "100%", marginTop: 10 }}
        />
      )}

      {type === "audio" && (
        <div style={{ marginTop: 10 }}>
          <input type="file" accept="audio/*" style={{ display: "none" }} id="ccb-audio-input"
            onChange={(e) => e.target.files?.[0] && uploadAudio(e.target.files[0])} />
          {audioUrl ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <audio src={audioUrl} controls style={{ flex: 1 }} />
              <button onClick={() => setAudioUrl("")} style={{ background: "var(--surface)", border: "none", borderRadius: 8, padding: "8px 12px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>✕</button>
            </div>
          ) : (
            <label htmlFor="ccb-audio-input" style={{ display: "block", width: "100%", background: "var(--page-bg)", border: "2px dashed var(--border)", borderRadius: "var(--radius-md)", padding: "18px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, textAlign: "center" }}>
              {uploading ? "⏳ Chargement..." : "🎵 Cliquer pour téléverser un fichier audio"}
            </label>
          )}
        </div>
      )}

      {type === "pdf" && (
        <div style={{ marginTop: 10 }}>
          <input type="file" accept="application/pdf" style={{ display: "none" }} id="ccb-pdf-input"
            onChange={(e) => e.target.files?.[0] && uploadPdf(e.target.files[0])} />
          {pdfUrl ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--page-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
              <span style={{ fontSize: 22 }}>📄</span>
              <a href={pdfUrl} target="_blank" rel="noopener" style={{ flex: 1, color: "var(--gold)", fontSize: 13, textDecoration: "underline" }}>Voir le PDF</a>
              <button onClick={() => setPdfUrl("")} style={{ background: "var(--surface)", border: "none", borderRadius: 8, padding: "5px 10px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>✕</button>
            </div>
          ) : (
            <label htmlFor="ccb-pdf-input" style={{ display: "block", width: "100%", background: "var(--page-bg)", border: "2px dashed var(--border)", borderRadius: "var(--radius-md)", padding: "18px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, textAlign: "center" }}>
              {uploading ? "⏳ Chargement..." : "📄 Cliquer pour téléverser un PDF"}
            </label>
          )}
        </div>
      )}

      {type === "link" && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="URL du lien *" style={inputStyle} />
          <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Titre (optionnel)" style={inputStyle} />
          <input value={linkDesc} onChange={(e) => setLinkDesc(e.target.value)} placeholder="Description courte (optionnel)" style={inputStyle} />
        </div>
      )}

      {(type === "poll" || type === "quiz") && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
            {type === "quiz" ? "Cochez la bonne réponse :" : "Options du sondage :"}
          </div>
          {type === "poll" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pollOptions.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input value={opt} onChange={(e) => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }}
                    placeholder={`Option ${i + 1}`}
                    style={{ ...inputStyle, flex: 1, padding: "8px 12px" }}
                  />
                  {pollOptions.length > 2 && <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} style={{ background: "var(--surface)", border: "none", borderRadius: "var(--radius-sm)", width: 32, color: "var(--error)", cursor: "pointer" }}>✕</button>}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button onClick={() => setPollOptions([...pollOptions, ""])} style={{ background: "var(--page-bg)", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", padding: "8px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>+ Ajouter une option</button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {quizOptions.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={opt.correct} onChange={(e) => { const n = [...quizOptions]; n[i] = { ...n[i], correct: e.target.checked }; setQuizOptions(n); }}
                    style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--success)" }}
                  />
                  <input value={opt.text} onChange={(e) => { const n = [...quizOptions]; n[i].text = e.target.value; setQuizOptions(n); }}
                    placeholder={`Réponse ${i + 1}`}
                    style={{ ...inputStyle, flex: 1, padding: "8px 12px", border: `1px solid ${opt.correct ? "var(--success)" : "var(--border)"}` }}
                  />
                  {quizOptions.length > 2 && <button onClick={() => setQuizOptions(quizOptions.filter((_, j) => j !== i))} style={{ background: "var(--surface)", border: "none", borderRadius: "var(--radius-sm)", width: 32, color: "var(--error)", cursor: "pointer" }}>✕</button>}
                </div>
              ))}
              {quizOptions.length < 6 && (
                <button onClick={() => setQuizOptions([...quizOptions, { text: "", correct: false }])} style={{ background: "var(--page-bg)", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", padding: "8px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>+ Ajouter une réponse</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Catégorie déplacée en haut (dropdown), donc rien ici */}

      {error && <div style={{ color: "var(--error)", fontSize: 12, marginTop: 8 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
        <button onClick={() => setOpen(false)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "9px 18px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>Annuler</button>
        <button onClick={submit} disabled={saving} style={{ background: "linear-gradient(135deg, var(--gold-dark), var(--gold))", border: "none", borderRadius: "var(--radius-md)", padding: "9px 20px", color: "#000", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 13 }}>
          {saving ? "Publication..." : "Publier"}
        </button>
      </div>
    </div>
  );
}

// ─── Renderer contenu avec mentions cliquables ────────────────
function ContentWithMentions({ content, members }: { content: string; members: MemberLookup[] }) {
  if (members.length === 0) return <>{content}</>;
  const segments = renderSegments(content, members);
  return (
    <>
      {segments.map((s, i) => {
        if (s.type === "mention" && s.userId) {
          return (
            <Link key={i} href={`/community/profil/${s.userId}`}
              style={{ color: "#5A2CA0", fontWeight: 700, textDecoration: "none" }}>
              {s.content}
            </Link>
          );
        }
        return <span key={i}>{s.content}</span>;
      })}
    </>
  );
}

// ─── PostCard ─────────────────────────────────────────────────
function PostCard({ post, currentUserId, isAdmin, isLiked, isBookmarked, members, userVote, onLike, onComment, onCommentLike, onReply, onDelete, onPin, onVote, onBookmark, onReport, onShare }: {
  post: Post; currentUserId: string; isAdmin: boolean; isLiked: boolean; isBookmarked: boolean;
  members: MemberLookup[];
  userVote?: number;
  onLike: () => void;
  onComment: (text: string, parentId?: string) => void;
  onCommentLike: (commentId: string) => void;
  onReply: (parentId: string, text: string) => void;
  onDelete: () => void; onPin: () => void; onVote: (idx: number) => void;
  onBookmark: () => void;
  onReport: () => void;
  onShare: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [localLike, setLocalLike] = useState(isLiked);
  const [localLikeCount, setLocalLikeCount] = useState(post.likeCount);
  const [localBookmark, setLocalBookmark] = useState(isBookmarked);
  const [localVote, setLocalVote] = useState<number | undefined>(userVote);
  const [localVoteResults, setLocalVoteResults] = useState<number[]>(post.voteResults || []);

  const isMyPost = post.user_id === currentUserId;
  const cat = post.post_categories;
  const author = post.user_profiles;
  const kindDef = post.post_kind ? getPostKindDef(post.post_kind) : null;
  const ytId = post.post_type === "video" && post.media_url ? getYoutubeId(post.media_url) : null;

  function handleLike() {
    setLocalLike(!localLike);
    setLocalLikeCount((c) => localLike ? c - 1 : c + 1);
    onLike();
  }

  function handleVote(idx: number) {
    if (localVote !== undefined) return;
    setLocalVote(idx);
    setLocalVoteResults((prev) => { const n = [...prev]; n.push(idx); return n; });
    onVote(idx);
  }

  function handleComment() {
    if (!commentText.trim()) return;
    onComment(commentText);
    setCommentText("");
  }

  function handleReplySubmit() {
    if (!replyingTo || !replyText.trim()) return;
    onReply(replyingTo, replyText);
    setReplyText(""); setReplyingTo(null);
  }

  function handleBookmark() {
    setLocalBookmark((b) => !b);
    onBookmark();
  }

  const totalVotes = post.poll_options ? localVoteResults.length : 0;

  return (
    <div style={{ background: "var(--card-bg)", border: `1px solid ${post.is_pinned ? "rgba(212,175,55,0.3)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-lg)", marginBottom: 12, overflow: "hidden" }}>
      {post.is_pinned && (
        <div style={{ background: "rgba(212,175,55,0.08)", padding: "6px 16px", fontSize: 11, color: "var(--gold)", fontWeight: 600 }}>📌 Épinglé</div>
      )}
      <div style={{ padding: 16 }}>
        {/* En-tête */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
          <Avatar profile={author} size={38} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{author?.display_name || "Membre"}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(post.created_at)}</div>
          </div>
          {kindDef && (
            <span style={{ background: `${kindDef.color}1f`, border: `1px solid ${kindDef.color}66`, borderRadius: "var(--radius-full)", padding: "3px 10px", fontSize: 10, color: kindDef.color, fontWeight: 700, flexShrink: 0 }}>
              {kindDef.emoji} {kindDef.label}
            </span>
          )}
          {cat && (
            <span style={{ background: `${cat.color}20`, border: `1px solid ${cat.color}50`, borderRadius: "var(--radius-full)", padding: "3px 10px", fontSize: 10, color: cat.color, fontWeight: 600, flexShrink: 0 }}>
              {cat.icon} {cat.name}
            </span>
          )}
          {(isMyPost || isAdmin) && (
            <div style={{ display: "flex", gap: 4 }}>
              {isAdmin && (
                <button onClick={onPin} title={post.is_pinned ? "Désépingler" : "Épingler"} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>📌</button>
              )}
              <button onClick={onDelete} title="Supprimer" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>🗑️</button>
            </div>
          )}
        </div>

        {/* Titre de la publication (en gras) */}
        {post.title && (
          <h3 style={{
            fontSize: 17, fontWeight: 800, color: "var(--text-primary)",
            margin: "0 0 8px", lineHeight: 1.35, fontFamily: "var(--font-title)",
          }}>
            {post.title}
          </h3>
        )}

        {/* Contenu texte avec mentions cliquables */}
        <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6, margin: "0 0 12px", whiteSpace: "pre-wrap" }}>
          <ContentWithMentions content={post.content} members={members} />
        </p>

        {/* Médias */}
        {post.post_type === "image" && post.media_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.media_url} alt={post.content?.slice(0, 60) || "Publication"} style={{ width: "100%", borderRadius: "var(--radius-md)", maxHeight: 400, objectFit: "cover", marginBottom: 12 }} />
        )}

        {post.post_type === "video" && (
          <div style={{ marginBottom: 12, borderRadius: "var(--radius-md)", overflow: "hidden", aspectRatio: "16/9" }}>
            {ytId ? (
              <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${ytId}`} style={{ border: "none", display: "block" }} allowFullScreen />
            ) : post.media_url ? (
              <video src={post.media_url} controls style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
            ) : null}
          </div>
        )}

        {post.post_type === "link" && post.link_url && (
          <a href={post.link_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: "var(--page-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 14, marginBottom: 12, textDecoration: "none" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>🔗 {post.link_url}</div>
            {post.link_title && <div style={{ fontSize: 14, color: "var(--gold)", fontWeight: 600 }}>{post.link_title}</div>}
            {post.link_description && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{post.link_description}</div>}
          </a>
        )}

        {post.post_type === "audio" && post.audio_url && (
          <div style={{ marginBottom: 12, background: "var(--page-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 10 }}>
            <audio src={post.audio_url} controls style={{ width: "100%" }} />
          </div>
        )}

        {post.post_type === "pdf" && post.pdf_url && (
          <a href={post.pdf_url} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--page-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 14, marginBottom: 12, textDecoration: "none" }}>
            <span style={{ fontSize: 28 }}>📄</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700 }}>Document PDF</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Cliquer pour ouvrir</div>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: 14 }}>→</span>
          </a>
        )}

        {(post.post_type === "poll" || post.post_type === "quiz") && post.poll_options && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {post.poll_options.map((opt, i) => {
                const voteCount = localVoteResults.filter((v) => v === i).length;
                const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                const isCorrect = post.post_type === "quiz" && opt.correct;
                const isChosen = localVote === i;
                const showResult = localVote !== undefined;
                return (
                  <button key={i} onClick={() => handleVote(i)} disabled={localVote !== undefined}
                    style={{ position: "relative", background: showResult ? (isCorrect ? "rgba(74,222,128,0.1)" : isChosen ? "rgba(248,113,113,0.1)" : "var(--page-bg)") : "var(--page-bg)", border: `1px solid ${showResult ? (isCorrect ? "var(--success)" : isChosen ? "var(--error)" : "var(--border)") : "var(--border)"}`, borderRadius: "var(--radius-md)", padding: "10px 14px", textAlign: "left", cursor: localVote !== undefined ? "default" : "pointer", overflow: "hidden" }}>
                    {showResult && (
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: isCorrect ? "rgba(74,222,128,0.15)" : "rgba(212,175,55,0.1)", transition: "width 0.5s ease" }} />
                    )}
                    <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: showResult ? (isCorrect ? "var(--success)" : isChosen ? "var(--error)" : "var(--text-secondary)") : "var(--text-primary)" }}>
                        {post.post_type === "quiz" && showResult && (isCorrect ? "✅ " : isChosen ? "❌ " : "")}
                        {opt.text}
                      </span>
                      {showResult && <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{pct}%</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
              {totalVotes} vote{totalVotes > 1 ? "s" : ""}
              {localVote === undefined && " · Tapez pour voter"}
            </div>
          </div>
        )}

        {/* Actions : icônes seules, sans libellés */}
        <div style={{ display: "flex", gap: 4, paddingTop: 10, borderTop: "1px solid var(--border-subtle)", alignItems: "center" }}>
          <button onClick={handleLike} title="J'aime" style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 12px", borderRadius: 8,
            color: localLike ? "#1877F2" : "var(--text-muted)",
            fontSize: 13, fontWeight: localLike ? 700 : 500,
            transition: "background 0.15s",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--page-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: 18, filter: localLike ? "none" : "grayscale(100%) opacity(0.55)" }}>👍</span>
            {localLikeCount > 0 && <span>{localLikeCount}</span>}
          </button>

          <button onClick={() => setShowComments(!showComments)} title="Commenter" style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 12px", borderRadius: 8,
            color: "var(--text-muted)", fontSize: 13, fontWeight: 500,
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--page-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: 16 }}>💬</span>
            {post.comments.length > 0 && <span>{post.comments.length}</span>}
          </button>

          <button onClick={onShare} title="Partager" style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center",
            padding: "8px 12px", borderRadius: 8,
            color: "var(--text-muted)", fontSize: 16,
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--page-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ transform: "scaleX(-1)", display: "inline-block" }}>↪</span>
          </button>

          <div style={{ flex: 1 }} />

          {!isMyPost && (
            <button onClick={onReport} title="Signaler" style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 10px", borderRadius: 8,
              color: "var(--text-muted)", fontSize: 14,
            }}>
              ⚠️
            </button>
          )}
        </div>
      </div>

      {/* Commentaires (arborescence à 1 niveau de réponses) */}
      {showComments && (
        <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border-subtle)", padding: "12px 16px" }}>
          {(() => {
            const tops = post.comments.filter((c) => !c.parent_comment_id);
            const repliesByParent = post.comments
              .filter((c) => c.parent_comment_id)
              .reduce<Record<string, Comment[]>>((acc, c) => {
                const k = c.parent_comment_id as string;
                (acc[k] = acc[k] || []).push(c);
                return acc;
              }, {});
            return tops.map((c) => (
              <div key={c.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <Avatar profile={c.user_profiles} size={28} />
                  <div style={{ flex: 1, background: "var(--card-bg)", borderRadius: "var(--radius-md)", padding: "8px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{c.user_profiles?.display_name || "Membre"}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      <ContentWithMentions content={c.content} members={members} />
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11 }}>
                      <button onClick={() => onCommentLike(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: c.liked ? "#1877F2" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, padding: 0, fontWeight: c.liked ? 700 : 500 }}>
                        <span style={{ filter: c.liked ? "none" : "grayscale(100%) opacity(0.55)" }}>👍</span> {c.likeCount ?? 0}
                      </button>
                      <button onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
                        ↩ Répondre
                      </button>
                    </div>
                  </div>
                </div>

                {/* Réponses imbriquées */}
                {(repliesByParent[c.id] ?? []).map((r) => (
                  <div key={r.id} style={{ display: "flex", gap: 8, marginTop: 8, marginLeft: 38 }}>
                    <Avatar profile={r.user_profiles} size={24} />
                    <div style={{ flex: 1, background: "var(--card-bg)", borderRadius: "var(--radius-md)", padding: "6px 10px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>{r.user_profiles?.display_name || "Membre"}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        <ContentWithMentions content={r.content} members={members} />
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11 }}>
                        <button onClick={() => onCommentLike(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: r.liked ? "#1877F2" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, padding: 0, fontWeight: r.liked ? 700 : 500 }}>
                          <span style={{ filter: r.liked ? "none" : "grayscale(100%) opacity(0.55)" }}>👍</span> {r.likeCount ?? 0}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Input réponse avec @mention */}
                {replyingTo === c.id && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, marginLeft: 38 }}>
                    <div style={{ flex: 1 }}>
                      <MentionTextarea
                        multiline={false}
                        value={replyText} onChange={setReplyText}
                        members={members}
                        onKeyDown={(e) => e.key === "Enter" && handleReplySubmit()}
                        placeholder="Répondre… (tapez @ pour mentionner)"
                        autoFocus
                        style={{ width: "100%", boxSizing: "border-box", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "6px 12px", color: "var(--text-primary)", fontSize: 12 } as React.CSSProperties}
                      />
                    </div>
                    <button onClick={handleReplySubmit} style={{ background: "var(--gold)", border: "none", borderRadius: "var(--radius-full)", padding: "6px 12px", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>➤</button>
                  </div>
                )}
              </div>
            ));
          })()}

          {/* Input nouveau commentaire avec @mention */}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <MentionTextarea
                multiline={false}
                value={commentText} onChange={setCommentText}
                members={members}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="Écrire un commentaire... (tapez @ pour mentionner)"
                style={{ width: "100%", boxSizing: "border-box", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "8px 14px", color: "var(--text-primary)", fontSize: 13 } as React.CSSProperties}
              />
            </div>
            <button onClick={handleComment} style={{ background: "var(--gold)", border: "none", borderRadius: "var(--radius-full)", padding: "8px 14px", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AdminCategoryManager ─────────────────────────────────────
function AdminCategoryManager({ categories, onCategoriesChange }: { categories: Category[]; onCategoriesChange: (cats: Category[]) => void }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(""); const [newIcon, setNewIcon] = useState("📌"); const [newColor, setNewColor] = useState("#d4af37");
  const [saving, setSaving] = useState(false);

  async function addCategory() {
    if (!newName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("post_categories").insert({ name: newName, icon: newIcon, color: newColor, sort_order: categories.length + 1 }).select().single();
    if (!error && data) onCategoriesChange([...categories, data]);
    setNewName(""); setSaving(false);
  }

  async function deleteCategory(id: string) {
    const supabase = createClient();
    await supabase.from("post_categories").delete().eq("id", id);
    onCategoriesChange(categories.filter((c) => c.id !== id));
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ background: "rgba(90,44,160,0.1)", border: "1px solid rgba(90,44,160,0.3)", borderRadius: "var(--radius-md)", padding: "8px 14px", color: "var(--violet-light)", fontSize: 12, cursor: "pointer", marginBottom: 16 }}>
      🛡️ Gérer les catégories
    </button>
  );

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid rgba(90,44,160,0.3)", borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--violet-light)" }}>🛡️ Gestion des catégories</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>
      {categories.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>{c.icon}</span>
          <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)" }}>{c.name}</span>
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: c.color }} />
          <button onClick={() => deleteCategory(c.id)} style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer", fontSize: 14 }}>🗑️</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        <input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="Icône"
          style={{ width: 50, background: "var(--page-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px", color: "var(--text-primary)", fontSize: 18, textAlign: "center" }} />
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom de la catégorie"
          style={{ flex: 1, background: "var(--page-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", color: "var(--text-primary)", fontSize: 13 }} />
        <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} style={{ width: 40, height: 36, border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", background: "none" }} />
        <button onClick={addCategory} disabled={saving} style={{ background: "linear-gradient(135deg, var(--violet-light), var(--violet-dark))", border: "none", borderRadius: "var(--radius-sm)", padding: "8px 14px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
          + Ajouter
        </button>
      </div>
    </div>
  );
}

// ─── FeedClient (export principal) ───────────────────────────
export default function FeedClient({ posts: initialPosts, categories: initialCategories, currentUserId, currentUserProfile, isAdmin, userLikedPostIds, userBookmarkedPostIds, userVotes, members = [] }: {
  posts: Post[]; categories: Category[]; currentUserId: string; currentUserProfile: CurrentUserProfile | null;
  isAdmin: boolean; userLikedPostIds: string[]; userBookmarkedPostIds?: string[]; userVotes: Record<string, number>;
  members?: MemberLookup[];
}) {
  const [posts, setPosts] = useState<Post[]>(() => {
    const cache = getClientCache();
    return cache && cache.posts.length > 0 ? cache.posts : initialPosts;
  });
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [filterKind, setFilterKind] = useState<PostKind | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"recent" | "popular">("recent");
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    const cache = getClientCache();
    return cache && cache.likedIds.size > 0 ? cache.likedIds : new Set(userLikedPostIds);
  });
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => new Set(userBookmarkedPostIds ?? []));
  const [myVotes, setMyVotes] = useState<Record<string, number>>(() => {
    const cache = getClientCache();
    return cache && Object.keys(cache.votes).length > 0 ? cache.votes : userVotes;
  });
  const userIdRef = useRef(currentUserId);

  useEffect(() => { const c = getClientCache(); if (c) c.posts = posts; }, [posts]);
  useEffect(() => { const c = getClientCache(); if (c) c.likedIds = likedIds; }, [likedIds]);
  useEffect(() => { const c = getClientCache(); if (c) c.votes = myVotes; }, [myVotes]);

  // ── Source de vérité : Realtime + double-sync ──
  useEffect(() => {
    let mounted = true;
    const uid = userIdRef.current;
    const supabase = createClient();
    const SEL = `id, user_id, category_id, post_type, post_kind, title, content, media_url, audio_url, pdf_url, link_url, link_title, link_description, poll_options, is_pinned, created_at, post_categories(name, icon, color)`;

    async function loadPosts() {
      if (!mounted) return;
      try {
        const { data: pd, error: pdErr } = await supabase.from("posts").select(SEL)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(60);
        if (pdErr) { console.error("[CCB Feed] SELECT posts error:", pdErr.message); return; }
        if (!pd || !mounted) return;

        const [{ data: lk, error: lkErr }, { data: cm, error: cmErr }, { data: vt }] = await Promise.all([
          supabase.from("post_likes").select("post_id, user_id"),
          supabase.from("post_comments").select("id, post_id, user_id, content, created_at"),
          supabase.from("poll_votes").select("post_id, user_id, option_index"),
        ]);
        if (!mounted) return;
        if (lkErr) console.warn("[CCB Feed] likes error:", lkErr.message);
        if (cmErr) console.warn("[CCB Feed] comments error:", cmErr.message);

        type PostRaw = { id: string; user_id: string };
        type CommentRaw = { id: string; post_id: string; user_id: string; content: string; created_at: string };
        type ProfileRaw = { user_id: string; display_name: string; avatar_url?: string | null };

        const postUserIds = [...new Set((pd as PostRaw[]).map((p) => p.user_id))];
        const commentUserIds = [...new Set(((cm || []) as CommentRaw[]).map((c) => c.user_id))];
        const allUserIds = [...new Set([...postUserIds, ...commentUserIds])];
        let rawProfiles: ProfileRaw[] = [];
        if (allUserIds.length > 0) {
          const { data: rpd, error: profErr } = await supabase
            .from("user_profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", allUserIds);
          if (profErr) console.warn("[CCB Feed] profiles error:", profErr.message);
          rawProfiles = (rpd as ProfileRaw[] | null) || [];
        }
        const profilesMap: Record<string, { display_name: string; avatar_url?: string }> = Object.fromEntries(
          rawProfiles.map((p) => [p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url ?? undefined }])
        );

        const lm: Record<string, number> = {};
        const cm2: Record<string, Comment[]> = {};
        const vm: Record<string, number[]> = {};
        const liked = new Set<string>();
        const voted: Record<string, number> = {};

        for (const l of lk || []) {
          lm[l.post_id] = (lm[l.post_id] || 0) + 1;
          if (l.user_id === uid) liked.add(l.post_id);
        }
        for (const c of (cm || []) as CommentRaw[]) {
          if (!cm2[c.post_id]) cm2[c.post_id] = [];
          cm2[c.post_id].push({ ...c, user_profiles: profilesMap[c.user_id] || undefined });
        }
        for (const v of vt || []) {
          if (!vm[v.post_id]) vm[v.post_id] = [];
          vm[v.post_id].push(v.option_index);
          if (v.user_id === uid) voted[v.post_id] = v.option_index;
        }

        const freshPosts = (pd as unknown as Post[]).map((p) => ({
          ...p,
          user_profiles: profilesMap[p.user_id] || undefined,
          likeCount: lm[p.id] || 0,
          comments: cm2[p.id] || [], voteResults: vm[p.id] || [],
        }));

        const freshIds = new Set(freshPosts.map((p) => p.id));
        setPosts((prev) => {
          const extra = prev.filter((p) => !freshIds.has(p.id));
          const merged = [...extra, ...freshPosts];
          const cache = getClientCache();
          if (cache) cache.posts = merged;
          return merged;
        });
        setLikedIds(liked);
        setMyVotes(voted);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[CCB Feed] loadPosts exception:", msg);
      }
    }

    loadPosts();

    const channel = supabase
      .channel("ccb-feed-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, async (payload) => {
        if (!mounted) return;
        const newRow = payload.new as { id: string; user_id: string };
        const [{ data, error }, { data: profileData }] = await Promise.all([
          supabase.from("posts").select(SEL).eq("id", newRow.id).single(),
          supabase.from("user_profiles").select("display_name, avatar_url").eq("user_id", newRow.user_id).single(),
        ]);
        if (error || !data || !mounted) return;
        const newPost = { ...(data as unknown as Post), user_profiles: (profileData as Post["user_profiles"]) || undefined, likeCount: 0, comments: [], voteResults: [] };
        setPosts((prev) => {
          if (prev.some((p) => p.id === newPost.id)) return prev;
          const next = [newPost, ...prev];
          const cache = getClientCache();
          if (cache) cache.posts = next;
          return next;
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, (payload) => {
        if (!mounted) return;
        const deletedId = (payload.old as { id: string }).id;
        setPosts((prev) => {
          const next = prev.filter((p) => p.id !== deletedId);
          const cache = getClientCache();
          if (cache) cache.posts = next;
          return next;
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload) => {
        if (!mounted) return;
        const u = payload.new as { id: string; is_pinned: boolean };
        setPosts((prev) => {
          const next = prev.map((p) => p.id === u.id ? { ...p, is_pinned: u.is_pinned } : p);
          const cache = getClientCache();
          if (cache) cache.posts = next;
          return next;
        });
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtres : kind + recherche full-text
  let filtered = posts;
  if (filterKind) filtered = filtered.filter((p) => p.post_kind === filterKind);
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    filtered = filtered.filter((p) => {
      const text = p.content.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const author = (p.user_profiles?.display_name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return text.includes(q) || author.includes(q);
    });
  }
  // Tri (les pinned restent toujours en premier dans le DB query)
  if (sortMode === "popular") {
    filtered = [...filtered].sort((a, b) => {
      // Pinned d'abord, puis par engagement (likes + comments)
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      const scoreA = (a.likeCount || 0) * 2 + (a.comments?.length || 0);
      const scoreB = (b.likeCount || 0) * 2 + (b.comments?.length || 0);
      return scoreB - scoreA;
    });
  }

  function handlePostCreated(post: Post) {
    setPosts((prev) => {
      if (prev.some((p) => p.id === post.id)) return prev;
      const next = [post, ...prev];
      const cache = getClientCache();
      if (cache) cache.posts = next;
      return next;
    });
  }

  async function handleLike(postId: string) {
    const supabase = createClient();
    if (likedIds.has(postId)) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", currentUserId);
      setLikedIds((s) => { const n = new Set(s); n.delete(postId); return n; });
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: currentUserId });
      setLikedIds((s) => new Set([...s, postId]));
    }
  }

  async function handleComment(postId: string, text: string, parentId?: string) {
    const supabase = createClient();
    const insertPayload: Record<string, unknown> = {
      post_id: postId, user_id: currentUserId, content: text,
    };
    if (parentId) insertPayload.parent_comment_id = parentId;
    const { data } = await supabase.from("post_comments")
      .insert(insertPayload)
      .select("id, user_id, content, created_at, parent_comment_id").single();
    if (data) {
      const commentProfile = currentUserProfile
        ? { display_name: currentUserProfile.display_name ?? "Membre", avatar_url: currentUserProfile.avatar_url ?? undefined }
        : undefined;
      const d = data as { id: string; user_id: string; content: string; created_at: string; parent_comment_id: string | null };
      const commentWithProfile: Comment = {
        id: d.id, user_id: d.user_id, content: d.content,
        created_at: d.created_at, parent_comment_id: d.parent_comment_id,
        likeCount: 0, liked: false, user_profiles: commentProfile,
      };
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments: [...p.comments, commentWithProfile] } : p));
      // Notif staff
      const author = currentUserProfile?.display_name || "Un membre";
      notifyCommunityStaff(
        `💬 ${author} a ${parentId ? "répondu à un commentaire" : "commenté un post"}`,
        text.slice(0, 120),
        "/community",
      );
      // Notif mentions
      const mentionedIds = getMentionedUserIds(text, members);
      if (mentionedIds.length > 0) {
        createMentionNotifications({
          mentionedIds, actorId: currentUserId, actorName: author,
          sourceType: "comment", sourceId: d.id, excerpt: text,
        });
      }
    }
  }

  async function handleCommentLike(postId: string, commentId: string) {
    const supabase = createClient();
    // Trouver l'état actuel pour toggle
    const post = posts.find((p) => p.id === postId);
    const comment = post?.comments.find((c) => c.id === commentId);
    const wasLiked = !!comment?.liked;
    // Optimiste
    setPosts((prev) => prev.map((p) => p.id !== postId ? p : {
      ...p,
      comments: p.comments.map((c) => c.id !== commentId ? c : {
        ...c, liked: !wasLiked, likeCount: (c.likeCount ?? 0) + (wasLiked ? -1 : 1),
      }),
    }));
    if (wasLiked) {
      await supabase.from("post_comment_likes").delete()
        .eq("comment_id", commentId).eq("user_id", currentUserId);
    } else {
      await supabase.from("post_comment_likes").insert({ comment_id: commentId, user_id: currentUserId });
    }
  }

  async function handleBookmark(postId: string) {
    const supabase = createClient();
    if (bookmarkedIds.has(postId)) {
      await supabase.from("post_bookmarks").delete()
        .eq("post_id", postId).eq("user_id", currentUserId);
      setBookmarkedIds((s) => { const n = new Set(s); n.delete(postId); return n; });
    } else {
      await supabase.from("post_bookmarks").insert({ post_id: postId, user_id: currentUserId });
      setBookmarkedIds((s) => new Set([...s, postId]));
    }
  }

  async function handleReport(postId: string) {
    const reason = prompt("Pourquoi signales-tu ce post ? (motif court)");
    if (!reason || !reason.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("post_reports").insert({
      post_id: postId, user_id: currentUserId, reason: reason.trim(),
    });
    if (error) { alert("Erreur signalement : " + error.message); return; }
    alert("Merci, ton signalement a été transmis aux modérateurs.");
    // Notif staff
    notifyCommunityStaff(
      "⚠️ Nouveau signalement",
      `Motif : ${reason.trim().slice(0, 100)}`,
      "/community",
    );
  }

  async function handleShare(postId: string) {
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://centrechretienberakah.com"}/community#post-${postId}`;
    const text = "Découvre cette publication sur la communauté CCB :";
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: "Communauté CCB", text, url }); return; } catch { /* fallback */ }
    }
    try { await navigator.clipboard.writeText(`${text} ${url}`); alert("Lien copié !"); } catch { /* noop */ }
  }

  async function handleDelete(postId: string) {
    if (!confirm("Supprimer ce post ?")) return;
    const supabase = createClient();
    await supabase.from("posts").delete().eq("id", postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  async function handlePin(postId: string) {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const supabase = createClient();
    await supabase.from("posts").update({ is_pinned: !post.is_pinned }).eq("id", postId);
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, is_pinned: !p.is_pinned } : p));
  }

  async function handleVote(postId: string, idx: number) {
    const supabase = createClient();
    await supabase.from("poll_votes").insert({ post_id: postId, user_id: currentUserId, option_index: idx });
    setMyVotes((prev) => ({ ...prev, [postId]: idx }));
  }

  return (
    <div>
      {/* Admin: gérer catégories */}
      {isAdmin && <AdminCategoryManager categories={categories} onCategoriesChange={setCategories} />}

      {/* Créer un post */}
      <PostCreator categories={categories} currentUserProfile={currentUserProfile} currentUserId={currentUserId} members={members} onPostCreated={handlePostCreated} />

      {/* Barre recherche + tri */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Rechercher dans la communauté…"
          style={{
            flex: 1, padding: "9px 14px",
            background: "var(--card-bg)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-full)", color: "var(--text-primary)",
            fontSize: 13, outline: "none",
          }}
        />
        <button onClick={() => setSortMode(sortMode === "recent" ? "popular" : "recent")}
          title={sortMode === "recent" ? "Trié par récent" : "Trié par popularité"}
          style={{
            background: "var(--card-bg)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-full)", padding: "9px 14px",
            color: "var(--text-secondary)", fontSize: 12, fontWeight: 700,
            cursor: "pointer", whiteSpace: "nowrap",
          }}>
          {sortMode === "recent" ? "🕐 Récent" : "🔥 Populaire"}
        </button>
      </div>

      {/* Filtres par type de publication (kind) */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 10,
        overflowX: "auto", WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none", paddingBottom: 4,
      }}>
        <button onClick={() => setFilterKind("")} style={{
          flexShrink: 0,
          background: !filterKind ? "rgba(90,44,160,0.15)" : "var(--card-bg)",
          border: `1px solid ${!filterKind ? "#5A2CA0" : "var(--border)"}`,
          borderRadius: "var(--radius-full)", padding: "5px 12px",
          color: !filterKind ? "#5A2CA0" : "var(--text-muted)",
          fontSize: 11, fontWeight: !filterKind ? 700 : 500, cursor: "pointer",
          whiteSpace: "nowrap",
        }}>Tous types</button>
        {POST_KINDS.map((k) => {
          const active = filterKind === k.id;
          return (
            <button key={k.id} onClick={() => setFilterKind(active ? "" : k.id)}
              style={{
                flexShrink: 0,
                background: active ? `${k.color}1f` : "var(--card-bg)",
                border: `1px solid ${active ? k.color : "var(--border)"}`,
                borderRadius: "var(--radius-full)", padding: "5px 12px",
                color: active ? k.color : "var(--text-muted)",
                fontSize: 11, fontWeight: active ? 700 : 500,
                cursor: "pointer", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 4,
              }}>
              <span>{k.emoji}</span>{k.label}
            </button>
          );
        })}
      </div>

      {/* Liste des posts */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Aucun post pour l&apos;instant. Soyez le premier à partager !</div>
        </div>
      ) : (
        filtered.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            isLiked={likedIds.has(post.id)}
            isBookmarked={bookmarkedIds.has(post.id)}
            members={members}
            userVote={myVotes[post.id]}
            onLike={() => handleLike(post.id)}
            onComment={(text) => handleComment(post.id, text)}
            onCommentLike={(commentId) => handleCommentLike(post.id, commentId)}
            onReply={(parentId, text) => handleComment(post.id, text, parentId)}
            onDelete={() => handleDelete(post.id)}
            onPin={() => handlePin(post.id)}
            onVote={(idx) => handleVote(post.id, idx)}
            onBookmark={() => handleBookmark(post.id)}
            onReport={() => handleReport(post.id)}
            onShare={() => handleShare(post.id)}
          />
        ))
      )}
    </div>
  );
}
