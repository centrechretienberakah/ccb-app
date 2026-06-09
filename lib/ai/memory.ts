import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mémoire BERAKAH AI — persistance des conversations/messages d'un membre.
 * Toutes les fonctions sont best-effort : en cas d'erreur (ex. migration v64 non
 * appliquée), elles échouent silencieusement et le chat continue sans persistance.
 */

export interface AiConversation { id: string; title: string | null; updated_at: string }
export interface AiMessage { role: "user" | "assistant"; content: string }

export async function loadConversations(sb: SupabaseClient, limit = 30): Promise<AiConversation[]> {
  const { data } = await sb
    .from("ai_conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AiConversation[];
}

export async function loadMessages(sb: SupabaseClient, conversationId: string): Promise<AiMessage[]> {
  const { data } = await sb
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []) as AiMessage[];
}

export async function createConversation(sb: SupabaseClient, userId: string, title: string): Promise<string | null> {
  const { data } = await sb
    .from("ai_conversations")
    .insert({ user_id: userId, title: title.slice(0, 80) })
    .select("id")
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

export async function saveMessage(sb: SupabaseClient, conversationId: string, userId: string, role: "user" | "assistant", content: string): Promise<void> {
  await sb.from("ai_messages").insert({ conversation_id: conversationId, user_id: userId, role, content });
}

export async function touchConversation(sb: SupabaseClient, conversationId: string): Promise<void> {
  await sb.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
}

export async function deleteConversation(sb: SupabaseClient, conversationId: string): Promise<void> {
  await sb.from("ai_conversations").delete().eq("id", conversationId);
}
