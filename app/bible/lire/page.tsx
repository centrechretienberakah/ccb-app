import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LireBibleClient from "./LireBibleClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lire la Bible — CCB" };

export default async function LireBiblePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/bible/lire");
  return <LireBibleClient />;
}
