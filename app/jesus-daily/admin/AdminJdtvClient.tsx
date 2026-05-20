"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  JDTV_THEME as T,
  JDTV_FONTS as F,
  type JdtvCategory,
  type JdtvVideo,
  formatVideoDuration,
  formatViewCount,
  getYoutubeThumbnail,
  relativeDate,
} from "@/lib/jdtv/theme";
import { notifyJdtvNewVideo, notifyJdtvLiveNow } from "@/lib/jdtv/notify";

interface Props {
  currentUserId: string;
  categories: JdtvCategory[];
  videos: JdtvVideo[];
}

type Tab = "videos" | "categories";

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function uploadFile(file: File, kind: string): Promise<string | null> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "bin";
  const path = `jdtv/${kind}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("posts").upload(path, file);
  if (upErr) { alert("Erreur upload : " + upErr.message); return null; }
  const { data } = supabase.storage.from("posts").getPublicUrl(path);
  return data.publicUrl;
}

export default function AdminJdtvClient({ categories: initialCats, videos: initialVids }: Props) {
  const [tab, setTab] = useState<Tab>("videos");
  const [cats, setCats] = useState<JdtvCategory[]>(initialCats);
  const [vids, setVids] = useState<JdtvVideo[]>(initialVids);
  const [editingCat, setEditingCat] = useState<JdtvCategory | null>(null);
  const [editingVid, setEditingVid] = useState<JdtvVideo | null>(null);
  const [newCat, setNewCat] = useState(false);
  const [newVid, setNewVid] = useState(false);
  const [filter, setFilter] = useState("");

  const catsById = useMemo(() => {
    const m = new Map<string, JdtvCategory>();
    cats.forEach((c) => m.set(c.id, c));
    return m;
  }, [cats]);

  const filteredVids = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return vids;
    return vids.filter((v) =>
      v.title.toLowerCase().includes(q) ||
      (v.speaker ?? "").toLowerCase().includes(q) ||
      v.slug.toLowerCase().includes(q)
    );
  }, [vids, filter]);

  function refreshCat(c: JdtvCategory) {
    setCats((arr) => {
      const idx = arr.findIndex((x) => x.id === c.id);
      if (idx >= 0) { const next = arr.slice(); next[idx] = c; return next; }
      return [...arr, c].sort((a, b) => a.order_index - b.order_index);
    });
  }
  function removeCat(id: string) { setCats((arr) => arr.filter((c) => c.id !== id)); }

  function refreshVid(v: JdtvVideo) {
    setVids((arr) => {
      const idx = arr.findIndex((x) => x.id === v.id);
      if (idx >= 0) { const next = arr.slice(); next[idx] = v; return next; }
      return [v, ...arr];
    });
  }
  function removeVid(id: string) { setVids((arr) => arr.filter((v) => v.id !== id)); }

  return (
    <div style={{ minHeight: "100vh", background: T.bgGrad, color: T.text, fontFamily: F.body }}>
      {/* Header */}
      <header style={{
        padding: "26px 24px 16px", maxWidth: 1400, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6 }}>
            <Link href="/jesus-daily" style={{ color: T.textMuted, textDecoration: "none" }}>📺 Jesus Daily TV</Link>
            <span style={{ margin: "0 8px" }}>›</span>
            <span>Admin</span>
          </div>
          <h1 style={{ fontFamily: F.title, fontSize: 28, margin: 0 }}>⚙️ Console Jesus Daily TV</h1>
          <p style={{ color: T.textMuted, margin: "6px 0 0", fontSize: 13 }}>
            {vids.length} vidéo{vids.length > 1 ? "s" : ""} · {cats.length} catégorie{cats.length > 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/jesus-daily/admin/analytics" style={{
            padding: "10px 14px", background: "rgba(255,255,255,0.06)", color: T.text,
            border: `1px solid ${T.border}`, borderRadius: 10,
            fontWeight: 700, fontSize: 13, textDecoration: "none",
          }}>📊 Analytics</Link>
          <button onClick={() => setNewVid(true)} style={primaryBtn}>＋ Nouvelle vidéo</button>
          <button onClick={() => setNewCat(true)} style={secondaryBtn}>＋ Catégorie</button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", display: "flex", gap: 8, borderBottom: `1px solid ${T.border}` }}>
        <TabButton active={tab === "videos"} onClick={() => setTab("videos")}>🎬 Vidéos ({vids.length})</TabButton>
        <TabButton active={tab === "categories"} onClick={() => setTab("categories")}>📂 Catégories ({cats.length})</TabButton>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 24px 80px" }}>
        {tab === "videos" ? (
          <>
            <input
              type="search" placeholder="🔎 Rechercher (titre, slug, intervenant)..."
              value={filter} onChange={(e) => setFilter(e.target.value)}
              style={{
                width: "100%", padding: "12px 16px", marginBottom: 18,
                background: T.card, color: T.text, border: `1px solid ${T.border}`,
                borderRadius: 10, fontSize: 14,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredVids.length === 0 ? (
                <EmptyState
                  emoji="🎬"
                  title="Aucune vidéo"
                  text="Commencez par ajouter votre première vidéo Jesus Daily TV."
                  ctaLabel="＋ Créer une vidéo"
                  onCta={() => setNewVid(true)}
                />
              ) : null}
              {filteredVids.map((v) => (
                <VideoRow key={v.id} video={v} category={v.category_id ? catsById.get(v.category_id) ?? null : null}
                  onEdit={() => setEditingVid(v)}
                  onDelete={async () => {
                    if (!confirm(`Supprimer "${v.title}" ?`)) return;
                    const supabase = createClient();
                    const { error } = await supabase.from("jdtv_videos").delete().eq("id", v.id);
                    if (error) { alert("Erreur : " + error.message); return; }
                    removeVid(v.id);
                  }}
                  onNotify={async () => {
                    if (!confirm(`Envoyer une notification push 🔴 LIVE à tous les abonnés pour "${v.title}" ?`)) return;
                    const r = await notifyJdtvLiveNow({
                      videoTitle: v.title, videoSlug: v.slug, speaker: v.speaker,
                    });
                    if (r) alert("📢 Notification envoyée !");
                    else alert("⚠️ Notification push échouée (VAPID keys ou perm).");
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {cats.length === 0 ? (
              <EmptyState emoji="📂" title="Aucune catégorie" text="Créez votre première catégorie." ctaLabel="＋ Catégorie" onCta={() => setNewCat(true)} />
            ) : null}
            {cats.map((c) => (
              <CategoryCard key={c.id} cat={c} count={vids.filter((v) => v.category_id === c.id).length}
                onEdit={() => setEditingCat(c)}
                onDelete={async () => {
                  if (!confirm(`Supprimer la catégorie "${c.name}" ? Les vidéos seront détachées.`)) return;
                  const supabase = createClient();
                  const { error } = await supabase.from("jdtv_categories").delete().eq("id", c.id);
                  if (error) { alert("Erreur : " + error.message); return; }
                  removeCat(c.id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Forms */}
      {newCat || editingCat ? (
        <CategoryForm
          initial={editingCat}
          onClose={() => { setNewCat(false); setEditingCat(null); }}
          onSaved={(c) => { refreshCat(c); setNewCat(false); setEditingCat(null); }}
        />
      ) : null}
      {newVid || editingVid ? (
        <VideoForm
          initial={editingVid}
          categories={cats}
          allVideos={vids}
          onClose={() => { setNewVid(false); setEditingVid(null); }}
          onSaved={(v) => { refreshVid(v); setNewVid(false); setEditingVid(null); }}
        />
      ) : null}
    </div>
  );
}

// ─── Components ─────────────────────────────────────────────────────
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode; }) {
  return (
    <button onClick={onClick} style={{
      padding: "12px 20px", background: "transparent", border: "none",
      color: active ? T.text : T.textMuted, fontWeight: active ? 700 : 500,
      cursor: "pointer", fontSize: 14,
      borderBottom: `2px solid ${active ? T.violet : "transparent"}`,
      marginBottom: -1,
    }}>{children}</button>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "10px 18px", background: T.violet, color: "#fff", border: "none",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  padding: "10px 18px", background: "rgba(255,255,255,0.08)", color: "#fff",
  border: `1px solid ${T.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer",
};

function EmptyState({ emoji, title, text, ctaLabel, onCta }: {
  emoji: string; title: string; text: string; ctaLabel: string; onCta: () => void;
}) {
  return (
    <div style={{
      gridColumn: "1 / -1", padding: "40px 24px", textAlign: "center",
      background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14,
    }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>{emoji}</div>
      <h3 style={{ fontFamily: F.title, margin: "0 0 6px", fontSize: 20 }}>{title}</h3>
      <p style={{ color: T.textMuted, margin: "0 0 16px", fontSize: 14 }}>{text}</p>
      <button onClick={onCta} style={primaryBtn}>{ctaLabel}</button>
    </div>
  );
}

function VideoRow({ video, category, onEdit, onDelete, onNotify }: {
  video: JdtvVideo; category: JdtvCategory | null; onEdit: () => void; onDelete: () => void; onNotify: () => void;
}) {
  const thumb = video.thumbnail_url || getYoutubeThumbnail(video.video_url);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "150px 1fr auto", gap: 16, alignItems: "center",
      padding: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
    }}>
      <div style={{
        position: "relative", aspectRatio: "16/9",
        background: "#000", borderRadius: 8, overflow: "hidden",
      }}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            color: T.textMuted, fontSize: 24,
          }}>📺</div>
        )}
        {video.is_live ? (
          <span style={{
            position: "absolute", top: 4, left: 4, padding: "2px 6px", borderRadius: 3,
            background: T.live, color: "#fff", fontSize: 9, fontWeight: 800,
          }}>🔴 LIVE</span>
        ) : null}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
          {!video.is_published ? <Tag color={T.textMuted}>📝 Brouillon</Tag> : null}
          {video.is_premium ? <Tag color={T.gold} dark>👑 Premium</Tag> : null}
          {video.is_featured ? <Tag color={T.violet}>⭐ Featured</Tag> : null}
          {category ? <Tag color={T.border}>{category.icon} {category.name}</Tag> : null}
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 4 }}>{video.title}</div>
        <div style={{ display: "flex", gap: 12, color: T.textMuted, fontSize: 12, flexWrap: "wrap" }}>
          <span>/{video.slug}</span>
          {video.speaker ? <span>🎙️ {video.speaker}</span> : null}
          {video.duration_secs ? <span>⏱️ {formatVideoDuration(video.duration_secs)}</span> : null}
          <span>👁️ {formatViewCount(video.view_count)}</span>
          <span>📅 {relativeDate(video.published_at)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {video.is_live && video.is_published ? (
          <button onClick={onNotify} title="Notifier le LIVE"
            style={{ ...iconBtn, color: T.live, borderColor: T.live }}>📢</button>
        ) : null}
        <button onClick={onEdit} style={iconBtn}>✏️</button>
        <button onClick={onDelete} style={{ ...iconBtn, color: "#ff5470" }}>🗑️</button>
      </div>
    </div>
  );
}

function CategoryCard({ cat, count, onEdit, onDelete }: {
  cat: JdtvCategory; count: number; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div style={{
      padding: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 32 }}>{cat.icon ?? "📂"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{cat.name}</div>
          <div style={{ fontSize: 12, color: T.textMuted }}>/{cat.slug} · {count} vidéo{count > 1 ? "s" : ""}</div>
        </div>
      </div>
      {cat.description ? (
        <p style={{ margin: 0, color: T.textSoft, fontSize: 13, lineHeight: 1.4 }}>{cat.description}</p>
      ) : null}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        {!cat.is_published ? <Tag color={T.textMuted}>📝 Masquée</Tag> : <Tag color={T.completed}>✓ Publiée</Tag>}
        <span style={{ flex: 1 }} />
        <button onClick={onEdit} style={iconBtn}>✏️</button>
        <button onClick={onDelete} style={{ ...iconBtn, color: "#ff5470" }}>🗑️</button>
      </div>
    </div>
  );
}

function Tag({ children, color, dark = false }: { children: React.ReactNode; color: string; dark?: boolean; }) {
  return (
    <span style={{
      padding: "3px 8px", borderRadius: 4,
      background: dark ? color : `${color}22`,
      color: dark ? "#000" : "#fff",
      border: `1px solid ${color}`,
      fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
    }}>{children}</span>
  );
}

const iconBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8,
  background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`,
  color: T.text, cursor: "pointer", fontSize: 14,
};

// ─── Modal wrapper ──────────────────────────────────────────────────
function Modal({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, zIndex: 100, backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto",
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
        boxShadow: T.shadowMd, display: "flex", flexDirection: "column",
      }}>
        <header style={{ padding: "16px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: F.title, margin: 0, fontSize: 19 }}>{title}</h2>
          <button onClick={onClose} aria-label="Fermer" style={{
            width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.06)",
            border: "none", color: T.text, fontSize: 18, cursor: "pointer",
          }}>×</button>
        </header>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        <footer style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {footer}
        </footer>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</span>
      {children}
      {hint ? <span style={{ fontSize: 11, color: T.textMuted }}>{hint}</span> : null}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px", background: T.surface2, color: T.text,
  border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14,
};

// ─── CategoryForm ───────────────────────────────────────────────────
function CategoryForm({ initial, onClose, onSaved }: {
  initial: JdtvCategory | null; onClose: () => void; onSaved: (c: JdtvCategory) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? 0);
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [busy, setBusy] = useState(false);

  const finalSlug = slug.trim() || slugify(name);

  async function handleSave() {
    if (busy) return;
    if (!name.trim()) { alert("Nom requis"); return; }
    setBusy(true);
    const supabase = createClient();
    const payload = {
      name: name.trim(), slug: finalSlug, description: description.trim() || null,
      icon: icon.trim() || null, cover_url: coverUrl.trim() || null,
      order_index: orderIndex, is_published: isPublished,
    };
    let result;
    if (initial) {
      result = await supabase.from("jdtv_categories").update(payload).eq("id", initial.id).select().single();
    } else {
      result = await supabase.from("jdtv_categories").insert(payload).select().single();
    }
    setBusy(false);
    if (result.error) { alert("Erreur : " + result.error.message); return; }
    onSaved(result.data as JdtvCategory);
  }

  async function handleUploadCover(file: File) {
    setBusy(true);
    const url = await uploadFile(file, "category-cover");
    setBusy(false);
    if (url) setCoverUrl(url);
  }

  return (
    <Modal
      title={initial ? `Modifier — ${initial.name}` : "Nouvelle catégorie"}
      onClose={onClose}
      footer={<>
        <button onClick={onClose} style={secondaryBtn}>Annuler</button>
        <button onClick={handleSave} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Enregistrement..." : "Enregistrer"}
        </button>
      </>}>
      <Field label="Nom *"><input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} /></Field>
      <Field label="Slug" hint={`URL : /jesus-daily?cat=${finalSlug || "..."}`}>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(name)} style={inputStyle} />
      </Field>
      <Field label="Icône (emoji)"><input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} placeholder="🎙️" style={inputStyle} /></Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>
      <Field label="Cover URL (image bandeau)">
        <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
        <input type="file" accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadCover(f); }}
          style={{ marginTop: 6, fontSize: 12 }} />
      </Field>
      <div style={{ display: "flex", gap: 14 }}>
        <Field label="Ordre">
          <input type="number" value={orderIndex} onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)} style={inputStyle} />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22, cursor: "pointer" }}>
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          <span>Publier</span>
        </label>
      </div>
    </Modal>
  );
}

// ─── VideoForm ──────────────────────────────────────────────────────
function VideoForm({ initial, categories, allVideos, onClose, onSaved }: {
  initial: JdtvVideo | null; categories: JdtvCategory[]; allVideos: JdtvVideo[]; onClose: () => void; onSaved: (v: JdtvVideo) => void;
}) {
  const [categoryId, setCategoryId] = useState<string>(initial?.category_id ?? (categories[0]?.id ?? ""));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnail_url ?? "");
  const [heroUrl, setHeroUrl] = useState(initial?.hero_url ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? "");
  const [durationSecs, setDurationSecs] = useState<number | "">(initial?.duration_secs ?? "");
  const [speaker, setSpeaker] = useState(initial?.speaker ?? "");
  const [scripture, setScripture] = useState(initial?.scripture ?? "");
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? 0);
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);
  const [isPremium, setIsPremium] = useState(initial?.is_premium ?? false);
  const [isLive, setIsLive] = useState(initial?.is_live ?? false);
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [introEndSecs, setIntroEndSecs] = useState<number | "">(initial?.intro_end_secs ?? "");
  const [nextVideoId, setNextVideoId] = useState<string>(initial?.next_video_id ?? "");
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));
  const [busy, setBusy] = useState(false);

  const finalSlug = slug.trim() || slugify(title);

  async function handleSave() {
    if (busy) return;
    if (!title.trim()) { alert("Titre requis"); return; }
    if (!videoUrl.trim()) { alert("URL vidéo requise (YouTube, Vimeo ou mp4)"); return; }
    setBusy(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const supabase = createClient();
    const payload = {
      category_id: categoryId || null,
      title: title.trim(), slug: finalSlug,
      subtitle: subtitle.trim() || null, description: description.trim() || null,
      thumbnail_url: thumbnailUrl.trim() || null,
      hero_url: heroUrl.trim() || null,
      video_url: videoUrl.trim(),
      duration_secs: durationSecs === "" ? null : Number(durationSecs),
      speaker: speaker.trim() || null,
      scripture: scripture.trim() || null,
      order_index: orderIndex,
      is_published: isPublished,
      is_premium: isPremium,
      is_live: isLive,
      is_featured: isFeatured,
      intro_end_secs: introEndSecs === "" ? null : Number(introEndSecs),
      next_video_id: nextVideoId || null,
      tags,
    };
    let result;
    if (initial) {
      result = await supabase.from("jdtv_videos").update(payload).eq("id", initial.id).select().single();
    } else {
      result = await supabase.from("jdtv_videos").insert(payload).select().single();
    }
    setBusy(false);
    if (result.error) { alert("Erreur : " + result.error.message); return; }

    // ─── Notifications push ──────────────────────────────────────────
    const saved = result.data as JdtvVideo;
    const catName = saved.category_id
      ? (categories.find((c) => c.id === saved.category_id)?.name ?? null)
      : null;
    const wasLive = initial?.is_live ?? false;
    const wasPublished = initial?.is_published ?? false;
    const goingLive = isLive && !wasLive && isPublished;
    const newlyPublished = isPublished && !wasPublished; // includes nouvelle vidéo et republication

    if (goingLive) {
      const ok = confirm("🔴 Envoyer une notification push à TOUS les abonnés (Live démarré) ?");
      if (ok) {
        const r = await notifyJdtvLiveNow({
          videoTitle: saved.title, videoSlug: saved.slug, speaker: saved.speaker,
        });
        if (!r) alert("⚠️ Notification push échouée (VAPID keys ou perm).");
      }
    } else if (newlyPublished && !isLive) {
      const ok = confirm("✨ Envoyer une notification push à TOUS les abonnés (Nouvelle vidéo publiée) ?");
      if (ok) {
        const r = await notifyJdtvNewVideo({
          videoTitle: saved.title, videoSlug: saved.slug,
          categoryName: catName, speaker: saved.speaker,
        });
        if (!r) alert("⚠️ Notification push échouée (VAPID keys ou perm).");
      }
    }

    onSaved(saved);
  }

  async function handleUpload(file: File, target: "thumb" | "hero") {
    setBusy(true);
    const url = await uploadFile(file, target === "thumb" ? "video-thumb" : "video-hero");
    setBusy(false);
    if (url) { if (target === "thumb") setThumbnailUrl(url); else setHeroUrl(url); }
  }

  return (
    <Modal
      title={initial ? `Modifier — ${initial.title}` : "Nouvelle vidéo"}
      onClose={onClose}
      footer={<>
        <button onClick={onClose} style={secondaryBtn}>Annuler</button>
        <button onClick={handleSave} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Enregistrement..." : initial ? "Enregistrer" : "Publier"}
        </button>
      </>}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <Field label="Titre *"><input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} /></Field>
        <Field label="Slug" hint={`URL : /jesus-daily/video/${finalSlug || "..."}`}>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(title)} style={inputStyle} />
        </Field>
      </div>

      <Field label="Catégorie">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
          <option value="">— Aucune —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon ?? "📂"} {c.name}</option>)}
        </select>
      </Field>

      <Field label="Sous-titre / accroche"><input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} style={inputStyle} /></Field>

      <Field label="URL vidéo *" hint="YouTube, Vimeo, ou lien direct .mp4 / .m3u8">
        <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." style={inputStyle} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Thumbnail (16:9)">
          <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
          <input type="file" accept="image/*"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "thumb"); }}
            style={{ marginTop: 6, fontSize: 12 }} />
        </Field>
        <Field label="Hero (image grande)" hint="Pour le hero de la home">
          <input value={heroUrl} onChange={(e) => setHeroUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
          <input type="file" accept="image/*"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "hero"); }}
            style={{ marginTop: 6, fontSize: 12 }} />
        </Field>
      </div>

      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Field label="Intervenant"><input value={speaker} onChange={(e) => setSpeaker(e.target.value)} placeholder="Rév. Elvis NGUIFFO" style={inputStyle} /></Field>
        <Field label="Référence biblique"><input value={scripture} onChange={(e) => setScripture(e.target.value)} placeholder="Jean 3:16" style={inputStyle} /></Field>
        <Field label="Durée (secondes)">
          <input type="number" value={durationSecs} onChange={(e) => setDurationSecs(e.target.value === "" ? "" : parseInt(e.target.value))} style={inputStyle} />
        </Field>
      </div>

      <Field label="Tags" hint="Séparés par des virgules">
        <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="évangile, foi, espérance" style={inputStyle} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Skip Intro (secondes)" hint="Permet de sauter l'intro (HTML5 vidéo)">
          <input type="number" value={introEndSecs}
            onChange={(e) => setIntroEndSecs(e.target.value === "" ? "" : parseInt(e.target.value))}
            placeholder="ex. 12" style={inputStyle} />
        </Field>
        <Field label="Vidéo suivante" hint="Auto-play après la fin (sinon recommandation auto)">
          <select value={nextVideoId} onChange={(e) => setNextVideoId(e.target.value)} style={inputStyle}>
            <option value="">— Auto (recommandation) —</option>
            {allVideos
              .filter((v) => v.id !== initial?.id)
              .map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Ordre"><input type="number" value={orderIndex} onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)} style={inputStyle} /></Field>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        <Toggle label="📢 Publié" value={isPublished} onChange={setIsPublished} />
        <Toggle label="👑 Premium" value={isPremium} onChange={setIsPremium} />
        <Toggle label="🔴 En direct" value={isLive} onChange={setIsLive} />
        <Toggle label="⭐ Mis en avant (Hero)" value={isFeatured} onChange={setIsFeatured} />
      </div>
    </Modal>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void; }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", background: T.surface2, border: `1px solid ${T.border}`,
      borderRadius: 8, cursor: "pointer", fontSize: 13,
    }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
