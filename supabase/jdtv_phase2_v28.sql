-- =====================================================================
-- CCB JESUS DAILY TV PHASE 2 v28 — RPC view count + helpers admin
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── RPC : increment view count safely ───────────────────────────────
CREATE OR REPLACE FUNCTION public.jdtv_increment_view(p_video_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.jdtv_videos
  SET view_count = view_count + 1
  WHERE id = p_video_id AND is_published = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.jdtv_increment_view(UUID) TO authenticated, anon;

-- ─── Optional : helper update updated_at trigger ─────────────────────
CREATE OR REPLACE FUNCTION public.jdtv_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jdtv_videos_updated_at ON public.jdtv_videos;
CREATE TRIGGER trg_jdtv_videos_updated_at
  BEFORE UPDATE ON public.jdtv_videos
  FOR EACH ROW EXECUTE FUNCTION public.jdtv_touch_updated_at();

DROP TRIGGER IF EXISTS trg_jdtv_categories_updated_at ON public.jdtv_categories;
CREATE TRIGGER trg_jdtv_categories_updated_at
  BEFORE UPDATE ON public.jdtv_categories
  FOR EACH ROW EXECUTE FUNCTION public.jdtv_touch_updated_at();

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Jesus Daily TV Phase 2 v28
-- =====================================================================
