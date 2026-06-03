"use client";

import { createClient } from "@/lib/supabase/client";

export interface FollowStats {
  followers: number;
  following: number;
  isFollowing: boolean;
}

/** Récupère les stats d'abonnement d'un profil (followers, following, is_following). */
export async function getFollowStats(userId: string): Promise<FollowStats> {
  try {
    const sb = createClient();
    const { data, error } = await sb.rpc("follow_stats", { p_user: userId });
    if (error || !data || !data[0]) return { followers: 0, following: 0, isFollowing: false };
    const row = data[0] as { followers: number; following: number; is_following: boolean };
    return {
      followers: row.followers ?? 0,
      following: row.following ?? 0,
      isFollowing: !!row.is_following,
    };
  } catch {
    return { followers: 0, following: 0, isFollowing: false };
  }
}

/**
 * Toggle l'abonnement. Renvoie true si on suit désormais, false sinon,
 * null en cas d'erreur. La notification in-app "nouvel abonné" est créée
 * automatiquement côté serveur par le RPC toggle_follow (SECURITY DEFINER).
 */
export async function toggleFollow(targetId: string): Promise<boolean | null> {
  try {
    const sb = createClient();
    const { data, error } = await sb.rpc("toggle_follow", { p_target: targetId });
    if (error) return null;
    return !!data;
  } catch {
    return null;
  }
}
