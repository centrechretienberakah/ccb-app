// Charte visuelle module Institut Biblique Berakah — premium chrétien moderne
// Violet royal + or + lavande sur fond ivoire

export const INSTITUT_THEME = {
  bg:           "#0a0a0a",       // noir immersif (page)
  card:         "#140f1f",
  surface2:     "#1b1530",
  border:       "rgba(212,175,55,0.16)",
  borderSoft:   "rgba(255,255,255,0.07)",
  text:         "#f5f1e8",
  textSoft:     "#cbc4d6",
  textMuted:    "#8a8296",

  violet:       "#7C3AED",
  violetDark:   "#5A2CA0",
  violetSoft:   "rgba(124,58,237,0.16)",
  lavender:     "#EDE7FA",
  gold:         "#D4AF37",
  goldDark:     "#A8862B",

  // Status
  completed:    "#34d058",
  inProgress:   "#D4AF37",

  // Shadows
  shadowSoft:   "0 2px 12px rgba(0,0,0,0.40)",
  shadowMd:     "0 8px 28px rgba(0,0,0,0.50)",
  shadowGlow:   "0 0 40px rgba(124,58,237,0.22)",
} as const;

export const INSTITUT_FONTS = {
  title: "var(--font-cinzel), 'Segoe UI', system-ui, sans-serif",
  body:  "var(--font-montserrat), system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

export type Level = "beginner" | "intermediate" | "advanced";

export interface LevelDef {
  id: Level;
  label: string;
  emoji: string;
  color: string;
}

export const LEVELS: LevelDef[] = [
  { id: "beginner",     label: "Débutant",    emoji: "🌱", color: "#2E9B47" },
  { id: "intermediate", label: "Intermédiaire", emoji: "📘", color: "#D4AF37" },
  { id: "advanced",     label: "Avancé",      emoji: "🎓", color: "#5B21B6" },
];

export function getLevelDef(id: string | null | undefined): LevelDef {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

// ─── Types DB ────────────────────────────────────────────────────────
export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  cover_url: string | null;
  order_index: number;
  is_published: boolean;
}

export interface Subcategory {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  order_index: number;
  is_published: boolean;
}

export interface Course {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnail_url: string | null;
  trailer_url: string | null;
  level: Level;
  duration_mins: number | null;
  instructor: string | null;
  is_published: boolean;
  is_premium: boolean;
  order_index: number;
}

export interface Module {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  description: string | null;
  order_index: number;
}

export interface QuizOption {
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  q: string;
  options: QuizOption[];
}

export interface Lesson {
  id: string;
  module_id: string;
  course_id: string;
  slug: string;
  title: string;
  description: string | null;
  content_md: string | null;
  video_url: string | null;
  audio_url: string | null;
  pdf_url: string | null;
  duration_secs: number | null;
  order_index: number;
  is_premium: boolean;
  quiz_questions?: QuizQuestion[] | null;
}

export interface UserProgress {
  lesson_id: string;
  course_id: string;
  is_completed: boolean;
  watched_secs: number;
  last_seen_at: string;
  completed_at: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────
export function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export function formatLessonDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Détecte YouTube/Vimeo
export function getEmbedUrl(url: string): { provider: "youtube" | "vimeo" | "direct"; src: string } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?/\s]{11})/);
  if (yt) return { provider: "youtube", src: `https://www.youtube.com/embed/${yt[1]}?modestbranding=1&rel=0` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { provider: "vimeo", src: `https://player.vimeo.com/video/${vm[1]}` };
  // Direct .mp4 ou autre
  return { provider: "direct", src: url };
}

// Helper notif staff
export async function notifyInstitutStaff(title: string, body: string, url = "/institut"): Promise<void> {
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, url, audience: "admins" }),
    });
  } catch { /* noop */ }
}
