import { redirect } from "next/navigation";

// L'ancienne page « Méditons Ensemble » a été fusionnée dans l'accueil.
// On redirige proprement /devotion → /dashboard pour conserver les anciens
// liens et marque-pages. (devotions-data.ts reste utilisé par les crons/fetch.)
export const dynamic = "force-dynamic";

export default function DevotionRedirect() {
  redirect("/dashboard");
}
