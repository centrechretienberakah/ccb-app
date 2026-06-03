import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import DmCallClient from "./DmCallClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Appel privé — CCB" };

export default async function DmCallPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const mode: "audio" | "video" = sp?.mode === "audio" ? "audio" : "video";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/community/messages/${id}/call`);

  // Vérifie l'accès (RLS : conversation visible uniquement si membre)
  const { data: conv } = await supabase
    .from("conversations").select("id, type, title").eq("id", id).maybeSingle();
  if (!conv) return notFound();
  const c = conv as { id: string; type: "dm" | "group"; title: string | null };

  // Nom de l'interlocuteur (DM) ou titre du mini-groupe
  let title = c.title ?? "Conversation";
  let myName = "Membre CCB";
  try {
    const { data: members } = await supabase
      .from("conversation_members").select("user_id").eq("conversation_id", id);
    const ids = ((members ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);
    const otherId = ids.find((uid) => uid !== user.id);
    const { data: profs } = await supabase
      .from("user_profiles").select("user_id, display_name").in("user_id", ids);
    const map: Record<string, string | null> = {};
    for (const p of (profs ?? []) as Array<{ user_id: string; display_name: string | null }>) {
      map[p.user_id] = p.display_name;
    }
    if (c.type === "dm" && otherId && map[otherId]) title = map[otherId] as string;
    if (map[user.id]) myName = map[user.id] as string;
  } catch { /* noop */ }

  return (
    <DmCallClient
      conversationId={id}
      title={title}
      mode={mode}
      myName={myName}
    />
  );
}
