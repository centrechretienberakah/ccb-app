import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const runtime = "nodejs";

function parseUA(ua: string): { device: string; browser: string } {
  let browser = "Inconnu";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Chromium/i.test(ua)) browser = "Chromium";

  let device = "Ordinateur";
  if (/iPad|Tablet/i.test(ua)) device = "Tablette";
  else if (/Mobile|Android|iPhone|iPod/i.test(ua)) device = "Mobile";
  return { device, browser };
}

// POST /api/track/session — enregistre IP/appareil du membre courant (dédup 6h)
export async function POST(req: NextRequest) {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ ok: false }, { status: 200 }); // silencieux

  const xff = req.headers.get("x-forwarded-for") || "";
  const ip = (xff.split(",")[0] || req.headers.get("x-real-ip") || "").trim() || null;
  const ua = req.headers.get("user-agent") || "";
  const { device, browser } = parseUA(ua);

  const admin = createSupabaseAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    // Dédup : ne pas réinsérer si une session identique existe dans les 6h
    const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
    const { data: recent } = await admin.from("member_sessions")
      .select("id, ip, user_agent").eq("user_id", user.id)
      .gte("created_at", since).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const r = recent as { ip: string | null; user_agent: string | null } | null;
    if (r && r.ip === ip && r.user_agent === ua) return NextResponse.json({ ok: true, dedup: true });

    await admin.from("member_sessions").insert({ user_id: user.id, ip, user_agent: ua, device, browser });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 }); // table v56 absente → silencieux
  }
}
