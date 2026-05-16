import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import webpush from "web-push";
import { getDailyVerse } from "@/lib/bible/verse-of-day";

export const runtime = "nodejs";

// Cron Vercel quotidien : envoie le verset du jour à tous les abonnés actifs
// Configuration : vercel.json → "0 6 * * *" (6h UTC, soit 7h Paris hiver)
//
// Sécurité : Vercel envoie automatiquement un header
// `authorization: Bearer ${CRON_SECRET}` si CRON_SECRET est défini.
// On vérifie ce header pour empêcher les appels externes.

function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:centrechretienberakah@gmail.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseAdmin(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function GET(req: NextRequest) {
  // Auth Vercel cron
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!configureWebPush()) {
    return NextResponse.json({ error: "VAPID keys non configurées" }, { status: 500 });
  }
  const admin = getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY non configurée" }, { status: 500 });
  }

  const verse = getDailyVerse();
  const title = `✨ Verset du jour — ${verse.reference}`;
  const body = verse.text.length > 140 ? verse.text.slice(0, 137) + "…" : verse.text;
  const url = `/bible/read/${encodeURIComponent(verse.book)}/${verse.chapter}`;
  const payload = JSON.stringify({ title, body, url });

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("enabled", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const subscriptions = (subs ?? []) as PushSubscriptionRow[];
  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, message: "Aucune subscription active." });
  }

  let sent = 0;
  let failed = 0;
  const invalidEndpoints: string[] = [];

  await Promise.all(subscriptions.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 6 * 60 * 60 }, // 6h
      );
      sent++;
    } catch (e) {
      failed++;
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) invalidEndpoints.push(s.endpoint);
    }
  }));

  if (invalidEndpoints.length > 0) {
    await admin.from("push_subscriptions")
      .update({ enabled: false })
      .in("endpoint", invalidEndpoints);
  }

  // Log dans admin_logs
  try {
    await admin.rpc("log_admin_action", {
      p_action: "cron.daily_verse",
      p_target_type: "push",
      p_target_id: null,
      p_details: { reference: verse.reference, sent, failed },
    });
  } catch { /* noop */ }

  return NextResponse.json({
    sent, failed, invalidated: invalidEndpoints.length,
    verse: { reference: verse.reference },
  });
}
