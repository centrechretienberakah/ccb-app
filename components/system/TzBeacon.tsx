"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { browserTimeZone, setUserTimeZoneLocal } from "@/lib/time/tz";

/**
 * TzBeacon — synchronise le fuseau horaire du membre.
 *
 * - Au login : si le profil n'a pas encore de fuseau, on détecte celui de
 *   l'appareil (Intl) et on l'enregistre (profil + localStorage).
 * - Si le membre a choisi un fuseau manuellement (profil.timezone), on le
 *   reflète dans localStorage → tout l'affichage utilise ce fuseau.
 *
 * Best-effort : si la colonne timezone n'existe pas (v61 non migrée), on garde
 * simplement le fuseau détecté du navigateur.
 */
export default function TzBeacon() {
  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;
        const { data, error } = await sb
          .from("user_profiles").select("timezone").eq("user_id", user.id).maybeSingle();
        if (error) return; // colonne absente → on conserve le fuseau navigateur
        const saved = (data as { timezone: string | null } | null)?.timezone;
        if (saved) {
          setUserTimeZoneLocal(saved);
        } else {
          const detected = browserTimeZone();
          setUserTimeZoneLocal(detected);
          try { await sb.from("user_profiles").update({ timezone: detected }).eq("user_id", user.id); } catch { /* noop */ }
        }
      } catch { /* noop */ }
    })();
  }, []);
  return null;
}
