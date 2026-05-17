-- =====================================================================
-- CCB FIX v17 — trigger notify_on_intercession utilisait prayer_request_id
-- Erreur : record "new" has no field "prayer_request_id"
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- Drop l'ancien trigger + fonction (peu importe la version)
DROP TRIGGER IF EXISTS trg_notify_intercession ON public.prayer_intercessions;
DROP FUNCTION IF EXISTS public.notify_on_intercession() CASCADE;

-- Recrée la fonction avec le bon nom de colonne (prayer_id) + bonne table (prayer_requests)
CREATE OR REPLACE FUNCTION public.notify_on_intercession()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_author UUID;
BEGIN
  -- La colonne s'appelle prayer_id et la table prayer_requests (pluriel)
  SELECT user_id INTO v_author
    FROM public.prayer_requests
    WHERE id = NEW.prayer_id;

  IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
    -- Best effort : si la table notifications n'existe pas, on ignore
    BEGIN
      PERFORM public.insert_notification(
        v_author, 'intercession',
        'Quelqu''un prie pour vous', NULL, '/prayer'
      );
    EXCEPTION WHEN OTHERS THEN
      -- table absente ou autre erreur → on ne bloque pas l'INSERT
      NULL;
    END;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_intercession ON public.prayer_intercessions;
CREATE TRIGGER trg_notify_intercession
  AFTER INSERT ON public.prayer_intercessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_intercession();

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v17
-- =====================================================================
