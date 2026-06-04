import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CompagnonClient from "./CompagnonClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compagnon Biblique IA — CCB" };

export default async function CompagnonPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/compagnon");

  let firstName = "ami";
  try {
    const { data } = await supabase
      .from("user_profiles").select("display_name").eq("user_id", user.id).maybeSingle();
    const dn = (data as { display_name: string | null } | null)?.display_name;
    if (dn) firstName = dn.split(" ")[0];
  } catch { /* noop */ }

  return <CompagnonClient firstName={firstName} />;
}
