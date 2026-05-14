import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = [
  "/dashboard", "/courses", "/bible", "/devotion",
  "/community", "/prayer", "/profile", "/settings",
  "/plan-biblique", "/events", "/notifications",
  "/enseignements", "/contact", "/rendez-vous",
  "/admin",
];
const PREMIUM_ROUTES = ["/premium"];

// Rôles autorisés à accéder à /admin
const ADMIN_ROLES = new Set(["owner", "admin", "moderator", "leader"]);

function getOwnerEmails(): string[] {
  return (process.env.OWNER_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Redirige les non-connectés vers login
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (isProtected && !user) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Redirige les connectés hors des pages auth
  if (user && (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register"))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── OWNER auto-promotion (sur /admin et /dashboard uniquement pour limiter le coût) ──
  if (user && (pathname.startsWith("/admin") || pathname === "/dashboard")) {
    const ownerEmails = getOwnerEmails();
    const userEmail = (user.email || "").toLowerCase();
    if (userEmail && ownerEmails.includes(userEmail)) {
      // Upsert role=owner si pas déjà owner (idempotent)
      await supabase
        .from("user_roles")
        .upsert({ user_id: user.id, role: "owner" }, { onConflict: "user_id" });
    }
  }

  // ── Protection /admin : role obligatoire ──
  if (pathname.startsWith("/admin") && user) {
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (!roleRow || !ADMIN_ROLES.has(roleRow.role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Protection premium → vérifie user_profiles
  const isPremiumRoute = PREMIUM_ROUTES.some((r) => pathname.startsWith(r));
  if (isPremiumRoute && user) {
    const { data: prof } = await supabase
      .from("user_profiles")
      .select("is_premium")
      .eq("user_id", user.id)
      .single();
    if (!prof?.is_premium) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
