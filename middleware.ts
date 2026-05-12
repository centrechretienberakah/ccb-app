import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = [
  "/dashboard", "/courses", "/bible", "/devotion",
  "/community", "/prayer", "/profile", "/settings",
  "/plan-biblique", "/events", "/notifications",
  "/enseignements", "/contact", "/rendez-vous",
];
const ADMIN_ROUTES   = ["/admin"];
const PREMIUM_ROUTES = ["/premium"];

export async function middleware(request: NextRequest) {
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

  // Protection routes admin → vérifie user_roles (bonne table)
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  if (isAdminRoute) {
    if (!user) {
      const url = new URL("/auth/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleRow?.role !== "admin" && roleRow?.role !== "leader") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Protection routes premium → vérifie user_profiles (bonne table)
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
