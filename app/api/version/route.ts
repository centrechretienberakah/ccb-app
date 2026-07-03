import { NextResponse } from "next/server";

export const runtime = "edge";        // rapide, pas de démarrage à froid
export const dynamic = "force-dynamic";

/**
 * GET /api/version → identifiant du déploiement courant (SHA du commit).
 *
 * Sert à l'app à détecter un NOUVEAU déploiement au réveil (BuildCheck) sans
 * recharger toute la page : on compare ce buildId au buildId chargé.
 * Jamais mis en cache.
 */
export function GET() {
  const buildId =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    "dev";
  return NextResponse.json(
    { buildId },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
