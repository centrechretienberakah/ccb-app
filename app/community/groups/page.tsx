import { redirect } from "next/navigation";

// La liste des groupes est désormais fusionnée dans la page unique
// « Discussions » (/community/messages). On redirige donc l'index des groupes
// vers cette page. Les sous-routes restent inchangées :
//   /community/groups/[id]            → conversation de groupe
//   /community/groups/admin           → dashboard admin des groupes
//   /community/groups/[id]/settings…  → réglages, fichiers, réunion…
export const dynamic = "force-dynamic";

export default function GroupsIndexRedirect() {
  redirect("/community/messages");
}
