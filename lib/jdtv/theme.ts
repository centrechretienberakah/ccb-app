// Charte visuelle module Jesus Daily TV — Netflix-style premium dark
// Fond sombre profond + violet royal CCB + or + accents rouge LIVE

export const JDTV_THEME = {
  // Dark base (Netflix-like)
  bg:           "#0A0A0F",       // noir profond
  bgGrad:       "linear-gradient(180deg, #16131E 0%, #0A0A0F 100%)",
  card:         "#16131E",
  cardHover:    "#1F1B2C",
  surface2:     "#221C30",
  border:       "rgba(255,255,255,0.08)",
  borderSoft:   "rgba(255,255,255,0.04)",
  text:         "#FFFFFF",
  textSoft:     "#E5E1F0",
  textMuted:    "#8A819F",

  // Branding CCB
  violet:       "#7C3AED",        // un peu plus lumineux pour dark mode
  violetDark:   "#5B21B6",
  violetSoft:   "rgba(124,58,237,0.16)",
  gold:         "#D4AF37",
  goldSoft:     "rgba(212,175,55,0.18)",

  // Live / accent
  live:         "#FF1744",
  liveSoft:     "rgba(255,23,68,0.18)",

  // Status
  completed:    "#2E9B47",

  // Shadows / glows
  shadowSoft:   "0 2px 12px rgba(0,0,0,0.4)",
  shadowMd:     "0 10px 28px rgba(0,0,0,0.55)",
  shadowGlow:   "0 0 48px rgba(124,58,237,0.25)",
} as const;

export const JDTV_FONTS = {
  title: "var(--font-cinzel), 'Segoe UI', system-ui, sans-serif",
  body:  "var(--font-montserrat), system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

// ─── Types DB ────────────────────────────────────────────────────────
export interface JdtvCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  cover_url: string | null;
  order_index: number;
  is_published: boolean;
}

export interface JdtvVideo {
  id: string;
  category_id: string | null;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnail_url: string | null;
  hero_url: string | null;
  video_url: string;
  duration_secs: number | null;
  speaker: string | null;
  scripture: string | null;
  published_at: string;
  is_published: boolean;
  is_premium: boolean;
  is_live: boolean;
  is_featured: boolean;
  view_count: number;
  order_index: number;
  tags: string[] | null;
  intro_end_secs?: number | null;
  outro_start_secs?: number | null;
  next_video_id?: string | null;
  chapters?: JdtvChapter[] | null;
  transcript_md?: string | null;
}

export interface JdtvChapter {
  time_secs: number;
  title: string;
}

export interface JdtvWatchProgress {
  video_id: string;
  watched_secs: number;
  is_completed: boolean;
  last_seen_at: string;
  completed_at: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────
export function formatVideoDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatViewCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)} k`;
  return `${(n / 1_000_000).toFixed(1)} M`;
}

export function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (h < 24) return `il y a ${h} h`;
  if (day < 7) return `il y a ${day} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// Détecte YouTube/Vimeo / direct
export function getEmbedUrl(url: string | null): { provider: "youtube" | "vimeo" | "direct"; src: string } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|live\/))([^&?/\s]{11})/);
  if (yt) return { provider: "youtube", src: `https://www.youtube.com/embed/${yt[1]}?modestbranding=1&rel=0` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { provider: "vimeo", src: `https://player.vimeo.com/video/${vm[1]}` };
  return { provider: "direct", src: url };
}

// Thumbnail YouTube auto si pas de thumbnail
export function getYoutubeThumbnail(url: string | null): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|live\/))([^&?/\s]{11})/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  return null;
}
