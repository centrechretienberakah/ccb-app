import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { notifyDevotionForParisDate } from "@/lib/devotion/notifyAll";

export const runtime = "nodejs";

/**
 * GET /api/devotion/notify
 *
 * Envoie la notif push « Méditons ensemble » à TOUS les membres (push activé),
 * à l'HEURE DE PARIS. Idempotent (1 envoi / membre / jour).
 *
 * Normalement déclenché automatiquement par le cron quotidien à minuit Paris
 * (cf /api/cron/daily). Cet endpoint reste disponible pour un déclenchement
 * MANUEL ou par un pinger externe — protégé par CRON_SECRET si défini.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY non configurée" }, { status: 503 });

  const result = await notifyDevotionForParisDate(admin);
  if (!result.ok && result.reason === "vapid-missing") {
    return NextResponse.json(
      { error: "VAPID keys non configurées (NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY)" },
      { status: 503 },
    );
  }
  return NextResponse.json(result);
}
