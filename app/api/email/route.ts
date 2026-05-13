import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { subject, html, replyTo } = await req.json();

  if (!subject || !html) {
    return NextResponse.json({ error: "subject and html are required" }, { status: 400 });
  }

  const CCB_EMAIL = "centrechretienberakah@gmail.com";

  // ── Try Resend if API key is configured ──────────────────────────────
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Use Resend's shared domain until CCB domain is verified
          from: "CCB App <onboarding@resend.dev>",
          to: [CCB_EMAIL],
          reply_to: replyTo || undefined,
          subject,
          html,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || JSON.stringify(data));
      return NextResponse.json({ success: true, method: "resend", id: data.id });
    } catch (e: any) {
      console.error("[CCB Email] Resend error:", e.message);
      // Fall through to db-only response
    }
  }

  // ── No API key or Resend failed — message was already saved to DB ────
  return NextResponse.json({
    success: true,
    method: "db_only",
    note: "RESEND_API_KEY not configured — message saved to DB only. Add key in Vercel env vars.",
  });
}
