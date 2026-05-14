import { createClient } from "@/lib/supabase/server";

export interface SiteContent {
  title: string | null;
  body_md: string | null;
  data_json: Record<string, unknown> | null;
}

// Lit un enregistrement site_content. Retourne null si la table n'existe pas
// encore ou si la page n'a jamais été éditée.
export async function getSiteContent(pageKey: string): Promise<SiteContent | null> {
  try {
    const sb = await createClient();
    const { data, error } = await sb
      .from("site_content")
      .select("title, body_md, data_json")
      .eq("page_key", pageKey)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    return {
      title: data.title,
      body_md: data.body_md,
      data_json: (data.data_json as Record<string, unknown>) ?? null,
    };
  } catch {
    return null;
  }
}
