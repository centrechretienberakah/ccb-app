-- =====================================================================
-- CCB JESUS DAILY TV PHASE 7 v31 — vues analytics agrégées
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── Stats par vidéo : vues, complétion, commentaires, réactions ─────
CREATE OR REPLACE VIEW public.jdtv_video_stats AS
SELECT
  v.id              AS video_id,
  v.slug,
  v.title,
  v.category_id,
  v.speaker,
  v.published_at,
  v.view_count,
  v.is_premium,
  v.is_live,
  COALESCE(p.viewers,            0)::INT AS viewers,
  COALESCE(p.completed_viewers,  0)::INT AS completed_viewers,
  CASE WHEN COALESCE(p.viewers, 0) > 0
       THEN ROUND(100.0 * COALESCE(p.completed_viewers, 0) / p.viewers)::INT
       ELSE 0 END AS completion_pct,
  COALESCE(c.comment_count,  0)::INT AS comment_count,
  COALESCE(r.reaction_count, 0)::INT AS reaction_count
FROM public.jdtv_videos v
LEFT JOIN (
  SELECT video_id,
         COUNT(*) AS viewers,
         COUNT(*) FILTER (WHERE is_completed) AS completed_viewers
  FROM public.jdtv_user_watch_progress
  GROUP BY video_id
) p ON p.video_id = v.id
LEFT JOIN (
  SELECT video_id, COUNT(*) AS comment_count
  FROM public.jdtv_comments
  GROUP BY video_id
) c ON c.video_id = v.id
LEFT JOIN (
  SELECT video_id, COUNT(*) AS reaction_count
  FROM public.jdtv_video_reactions
  GROUP BY video_id
) r ON r.video_id = v.id;

GRANT SELECT ON public.jdtv_video_stats TO authenticated, service_role;


-- ─── Top intervenants par cumul de vues ──────────────────────────────
CREATE OR REPLACE VIEW public.jdtv_top_speakers AS
SELECT
  COALESCE(speaker, '— Anonyme —') AS speaker,
  COUNT(*)::INT                    AS video_count,
  SUM(view_count)::BIGINT          AS total_views
FROM public.jdtv_videos
WHERE is_published = true
GROUP BY COALESCE(speaker, '— Anonyme —')
ORDER BY total_views DESC;

GRANT SELECT ON public.jdtv_top_speakers TO authenticated, service_role;


-- ─── Activité 30 jours : commentaires + nouvelles vidéos par jour ────
CREATE OR REPLACE VIEW public.jdtv_activity_30d AS
WITH days AS (
  SELECT generate_series(
    (NOW() - INTERVAL '29 days')::DATE,
    NOW()::DATE,
    INTERVAL '1 day'
  )::DATE AS day
),
videos_per_day AS (
  SELECT DATE(published_at) AS day, COUNT(*)::INT AS new_videos
  FROM public.jdtv_videos
  WHERE published_at >= NOW() - INTERVAL '30 days' AND is_published = true
  GROUP BY DATE(published_at)
),
comments_per_day AS (
  SELECT DATE(created_at) AS day, COUNT(*)::INT AS comments
  FROM public.jdtv_comments
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
),
viewers_per_day AS (
  SELECT DATE(last_seen_at) AS day, COUNT(DISTINCT user_id)::INT AS active_viewers
  FROM public.jdtv_user_watch_progress
  WHERE last_seen_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(last_seen_at)
)
SELECT
  d.day,
  COALESCE(v.new_videos,     0) AS new_videos,
  COALESCE(c.comments,       0) AS comments,
  COALESCE(vw.active_viewers, 0) AS active_viewers
FROM days d
LEFT JOIN videos_per_day   v  ON v.day  = d.day
LEFT JOIN comments_per_day c  ON c.day  = d.day
LEFT JOIN viewers_per_day  vw ON vw.day = d.day
ORDER BY d.day ASC;

GRANT SELECT ON public.jdtv_activity_30d TO authenticated, service_role;


-- ─── KPIs globaux ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.jdtv_global_kpis AS
SELECT
  (SELECT COUNT(*) FROM public.jdtv_videos WHERE is_published = true)::INT AS published_videos,
  (SELECT COUNT(*) FROM public.jdtv_videos WHERE is_live = true AND is_published = true)::INT AS live_now,
  (SELECT COUNT(*) FROM public.jdtv_videos WHERE is_premium = true AND is_published = true)::INT AS premium_videos,
  (SELECT COALESCE(SUM(view_count), 0) FROM public.jdtv_videos WHERE is_published = true)::BIGINT AS total_views,
  (SELECT COUNT(*) FROM public.jdtv_comments)::INT AS total_comments,
  (SELECT COUNT(*) FROM public.jdtv_video_reactions)::INT AS total_reactions,
  (SELECT COUNT(*) FROM public.jdtv_user_watch_progress)::INT AS unique_viewers_rows,
  (SELECT COUNT(*) FROM public.jdtv_user_watchlist)::INT AS watchlist_total,
  (SELECT COUNT(DISTINCT user_id) FROM public.jdtv_user_watch_progress)::INT AS unique_viewers,
  (SELECT COUNT(*) FROM public.jdtv_categories WHERE is_published = true)::INT AS published_categories;

GRANT SELECT ON public.jdtv_global_kpis TO authenticated, service_role;


-- ─── Engagement par catégorie ────────────────────────────────────────
CREATE OR REPLACE VIEW public.jdtv_category_engagement AS
SELECT
  c.id          AS category_id,
  c.slug,
  c.name,
  c.icon,
  COUNT(v.id)::INT                                AS video_count,
  COALESCE(SUM(v.view_count), 0)::BIGINT          AS total_views,
  COALESCE(SUM(s.comment_count), 0)::INT          AS total_comments,
  COALESCE(SUM(s.reaction_count), 0)::INT         AS total_reactions,
  COALESCE(AVG(s.completion_pct), 0)::INT         AS avg_completion_pct
FROM public.jdtv_categories c
LEFT JOIN public.jdtv_videos v ON v.category_id = c.id AND v.is_published = true
LEFT JOIN public.jdtv_video_stats s ON s.video_id = v.id
WHERE c.is_published = true
GROUP BY c.id, c.slug, c.name, c.icon
ORDER BY total_views DESC;

GRANT SELECT ON public.jdtv_category_engagement TO authenticated, service_role;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Jesus Daily TV Phase 7 v31
-- =====================================================================
