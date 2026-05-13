-- ============================================================
-- CCB App — Contact Messages & Pastoral Appointments Setup
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Ensure contact_messages table has is_read column
ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- 2. Ensure pastoral_appointments has status column
ALTER TABLE pastoral_appointments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'done'));

-- 3. Add notification types for contact & RDV
-- (extend the check constraint on notifications.type if it exists)
-- If there's no constraint, notifications will accept any type already.

-- 4. Trigger: notify admin when new contact message arrives
CREATE OR REPLACE FUNCTION notify_admin_new_contact()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  admin_uid UUID;
BEGIN
  -- Find all admins and leaders
  FOR admin_uid IN
    SELECT user_id FROM user_roles WHERE role IN ('admin', 'leader')
  LOOP
    INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
    VALUES (
      admin_uid,
      'contact',
      '📬 Nouveau message de contact',
      'De : ' || NEW.full_name || ' — Sujet : ' || NEW.subject,
      false,
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_contact ON contact_messages;
CREATE TRIGGER trg_notify_admin_new_contact
  AFTER INSERT ON contact_messages
  FOR EACH ROW EXECUTE FUNCTION notify_admin_new_contact();

-- 5. Trigger: notify admin when new RDV request arrives
CREATE OR REPLACE FUNCTION notify_admin_new_rdv()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  admin_uid UUID;
BEGIN
  FOR admin_uid IN
    SELECT user_id FROM user_roles WHERE role IN ('admin', 'leader')
  LOOP
    INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
    VALUES (
      admin_uid,
      'rdv',
      '🗓️ Nouvelle demande de RDV pastoral',
      'De : ' || NEW.full_name || ' — ' || NEW.preferred_date || ' à ' || NEW.preferred_time,
      false,
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_rdv ON pastoral_appointments;
CREATE TRIGGER trg_notify_admin_new_rdv
  AFTER INSERT ON pastoral_appointments
  FOR EACH ROW EXECUTE FUNCTION notify_admin_new_rdv();

-- 6. Trigger: notify user when their RDV status is updated
CREATE OR REPLACE FUNCTION notify_user_rdv_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status <> OLD.status AND NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
    VALUES (
      NEW.user_id,
      'rdv',
      CASE NEW.status
        WHEN 'confirmed' THEN '✅ RDV pastoral confirmé'
        WHEN 'cancelled' THEN '❌ RDV pastoral annulé'
        WHEN 'done'      THEN '🙏 RDV pastoral terminé'
        ELSE '🗓️ Mise à jour de votre RDV'
      END,
      CASE NEW.status
        WHEN 'confirmed' THEN 'Votre rendez-vous du ' || NEW.preferred_date || ' à ' || NEW.preferred_time || ' est confirmé.'
        WHEN 'cancelled' THEN 'Votre rendez-vous du ' || NEW.preferred_date || ' a été annulé. Contactez-nous pour replanifier.'
        WHEN 'done'      THEN 'Merci pour votre rencontre pastorale. Que Dieu vous bénisse !'
        ELSE 'Statut mis à jour : ' || NEW.status
      END,
      false,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_user_rdv_status ON pastoral_appointments;
CREATE TRIGGER trg_notify_user_rdv_status
  AFTER UPDATE ON pastoral_appointments
  FOR EACH ROW EXECUTE FUNCTION notify_user_rdv_status();

-- 7. Trigger: notify intercessors when someone marks a prayer answered
-- (keep existing if already present — this adds type 'prayer_answered')
CREATE OR REPLACE FUNCTION notify_prayer_answered()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_answered = true AND OLD.is_answered = false AND NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
    VALUES (
      NEW.user_id,
      'prayer_answered',
      '🙌 Prière exaucée !',
      'Votre prière "' || COALESCE(LEFT(NEW.title, 60), 'sans titre') || '" a été marquée comme exaucée. Gloire à Dieu !',
      false,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_prayer_answered ON prayer_requests;
CREATE TRIGGER trg_notify_prayer_answered
  AFTER UPDATE ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION notify_prayer_answered();

-- 8. Trigger: notify prayer requester when someone intercedes for them
CREATE OR REPLACE FUNCTION notify_intercession()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  requester_id UUID;
  intercessor_name TEXT;
BEGIN
  -- Get the original prayer requester
  SELECT user_id INTO requester_id FROM prayer_requests WHERE id = NEW.prayer_request_id;
  -- Don't notify yourself
  IF requester_id IS NULL OR requester_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  -- Get intercessor name
  SELECT COALESCE(display_name, full_name, 'Un(e) frère/sœur')
    INTO intercessor_name
    FROM user_profiles WHERE user_id = NEW.user_id;
  INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
  VALUES (
    requester_id,
    'intercession',
    '🙏 Quelqu''un prie pour vous',
    intercessor_name || ' intercède pour votre demande de prière.',
    false,
    NOW()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_intercession ON prayer_intercessions;
CREATE TRIGGER trg_notify_intercession
  AFTER INSERT ON prayer_intercessions
  FOR EACH ROW EXECUTE FUNCTION notify_intercession();

-- 9. RLS policies for contact_messages (admin/leader can read all)
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own contact" ON contact_messages;
CREATE POLICY "Users can insert own contact" ON contact_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read all contacts" ON contact_messages;
CREATE POLICY "Admins can read all contacts" ON contact_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'leader'))
  );

DROP POLICY IF EXISTS "Admins can update contacts" ON contact_messages;
CREATE POLICY "Admins can update contacts" ON contact_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'leader'))
  );

-- 10. RLS policies for pastoral_appointments
ALTER TABLE pastoral_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own rdv" ON pastoral_appointments;
CREATE POLICY "Users can insert own rdv" ON pastoral_appointments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own rdv" ON pastoral_appointments;
CREATE POLICY "Users can read own rdv" ON pastoral_appointments
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'leader'))
  );

DROP POLICY IF EXISTS "Admins can update rdv" ON pastoral_appointments;
CREATE POLICY "Admins can update rdv" ON pastoral_appointments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'leader'))
  );

-- ============================================================
-- IMPORTANT: Also add 'contact', 'rdv', 'intercession',
-- 'prayer_answered' to notifications.type CHECK constraint
-- if it has one. Otherwise skip.
-- ============================================================
