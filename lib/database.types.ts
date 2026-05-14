// Types de base de données CCB — dérivés des migrations SQL (canonique).
// Source: supabase/backend_complet.sql, schema.sql, admin_panel_v2.sql,
//         admin_rbac_v3.sql, schema_fixes_v4.sql, rls_rbac_alignment_v5.sql.
//
// Note : tous les champs additionnels sont optionnels pour tolérer les
// schémas partiellement migrés en prod.

export type Role = "owner" | "admin" | "moderator" | "leader" | "member" | "premium_member";

export interface UserProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  bio?: string | null;
  cell_group?: string | null;
  spiritual_level?: string | null;
  is_premium?: boolean;
  is_public?: boolean;
  is_disabled?: boolean;
  last_sign_in_at?: string | null;
  last_seen_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface UserRoleRow {
  id?: string;
  user_id: string;
  role: Role | string;
  granted_by?: string | null;
  granted_at?: string;
}

export interface PostRow {
  id: string;
  user_id: string;
  category_id?: string | null;
  post_type: "text" | "image" | "video" | "link" | "poll" | "quiz";
  content: string;
  media_url?: string | null;
  link_url?: string | null;
  link_title?: string | null;
  link_description?: string | null;
  poll_options?: { text: string; correct?: boolean }[] | null;
  is_pinned?: boolean;
  created_at: string;
}

export interface PostCategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface PrayerRow {
  id: string;
  user_id: string;
  title?: string | null;
  content: string;
  category?: string | null;
  is_anonymous?: boolean;
  is_answered: boolean;
  prayer_count?: number;
  testimony?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface DevotionRow {
  id: string;
  devotion_date: string;
  date?: string;
  title: string;
  verse_reference: string;
  verse_text: string;
  meditation_p1?: string | null;
  meditation_p2?: string | null;
  meditation_p3?: string | null;
  reflection_question?: string | null;
  prayer?: string | null;
  declaration?: string | null;
  author?: string;
  content?: string | null;
  created_at: string;
}

export interface EventRow {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  event_date: string;
  end_date?: string | null;
  location?: string | null;
  location_url?: string | null;
  is_online?: boolean;
  stream_url?: string | null;
  image_url?: string | null;
  max_attendees?: number | null;
  is_free?: boolean;
  price?: number | null;
  status?: "draft" | "upcoming" | "live" | "past" | "cancelled" | string;
  is_published?: boolean;
  event_type?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface ContactMessageRow {
  id: string;
  user_id?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface PastoralAppointmentRow {
  id: string;
  user_id?: string | null;
  full_name: string;
  phone: string;
  email?: string | null;
  subject: string;
  message?: string | null;
  preferred_date: string;
  preferred_time: string;
  modality: "presentiel" | "visio" | "telephone" | string;
  status: "pending" | "confirmed" | "cancelled" | "done" | string;
  created_at: string;
}

export interface MediaLibraryRow {
  id: string;
  title: string;
  description?: string | null;
  type: "pdf" | "audio" | "video" | "ebook" | "document" | string;
  category?: string | null;
  file_url: string;
  thumbnail_url?: string | null;
  file_size_mb?: number | null;
  duration_secs?: number | null;
  is_premium?: boolean;
  is_published?: boolean;
  download_count?: number;
  created_by?: string | null;
  created_at: string;
}

export interface CourseRow {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  thumbnail_url?: string | null;
  level?: "beginner" | "intermediate" | "advanced" | string;
  duration_mins?: number;
  is_premium?: boolean;
  is_published?: boolean;
  order_index?: number;
  created_at: string;
}

export interface SermonRow {
  id: string;
  title: string;
  description?: string | null;
  speaker?: string;
  series?: string | null;
  scripture_ref?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  thumbnail_url?: string | null;
  duration_secs?: number | null;
  is_published?: boolean;
  is_premium?: boolean;
  view_count?: number;
  published_at?: string | null;
  created_at: string;
}

export interface PhotoAlbumRow {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  event_id?: string | null;
  is_public?: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface PhotoRow {
  id: string;
  album_id: string;
  url: string;
  caption?: string | null;
  like_count?: number;
  uploaded_by?: string | null;
  created_at: string;
}

export interface GroupRow {
  id: string;
  name: string;
  description?: string | null;
  type?: "cell" | "prayer" | "study" | "mentoring" | "team" | string;
  cover_url?: string | null;
  is_private?: boolean;
  max_members?: number | null;
  created_by?: string | null;
  created_at: string;
  member_count?: number;
}

export interface GroupMemberRow {
  id: string;
  group_id: string;
  user_id: string;
  role?: "member" | "leader" | "admin" | string;
  joined_at: string;
}

export interface TestimonyRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category?: string | null;
  is_approved?: boolean;
  is_featured?: boolean;
  media_url?: string | null;
  created_at: string;
}

export interface SiteContentRow {
  id: string;
  page_key: string;
  title?: string | null;
  body_md?: string | null;
  data_json?: Record<string, unknown> | null;
  updated_by?: string | null;
  updated_at: string;
}

export interface AdminLogRow {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
}
