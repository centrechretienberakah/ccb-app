import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Alias anglais demandé par la spec → redirige vers la route existante
// /community/membres (page Membres déjà en place, 100% fonctionnelle).
export default function MembersAliasPage() {
  redirect("/community/membres");
}
