"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { JDTV_THEME as T } from "@/lib/jdtv/theme";

type Reaction = "clap" | "love" | "pray" | "fire" | "sparkle";

const REACTIONS: { id: Reaction; emoji: string; label: string }[] = [
  { id: "clap",    emoji: "👏", label: "Bravo"    },
  { id: "love",    emoji: "❤️", label: "J'aime"   },
  { id: "pray",    emoji: "🙏", label: "Prions"   },
  { id: "fire",    emoji: "🔥", label: "Puissant" },
  { id: "sparkle", emoji: "✨", label: "Inspirant"},
];

export default function ReactionsBar({
  videoId, initialCounts, initialUserReaction, isAuth,
}: {
  videoId: string;
  initialCounts: Record<Reaction, number>;
  initialUserReaction: Reaction | null;
  isAuth: boolean;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<Reaction, number>>(initialCounts);
  const [current, setCurrent] = useState<Reaction | null>(initialUserReaction);
  const [busy, setBusy] = useState<Reaction | null>(null);

  // Sync if initial change (after auth)
  useEffect(() => { setCurrent(initialUserReaction); }, [initialUserReaction]);

  async function react(r: Reaction) {
    if (busy) return;
    if (!isAuth) { router.push(`/auth/login?redirect=/jesus-daily/video/`); return; }
    setBusy(r);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(null); return; }

    if (current === r) {
      // toggle off
      await supabase.from("jdtv_video_reactions").delete()
        .eq("user_id", user.id).eq("video_id", videoId);
      setCounts({ ...counts, [r]: Math.max(0, counts[r] - 1) });
      setCurrent(null);
    } else if (current) {
      // switch reaction
      await supabase.from("jdtv_video_reactions")
        .update({ reaction: r }).eq("user_id", user.id).eq("video_id", videoId);
      const next = { ...counts };
      next[current] = Math.max(0, next[current] - 1);
      next[r] = next[r] + 1;
      setCounts(next);
      setCurrent(r);
    } else {
      // new reaction
      await supabase.from("jdtv_video_reactions")
        .insert({ user_id: user.id, video_id: videoId, reaction: r });
      setCounts({ ...counts, [r]: counts[r] + 1 });
      setCurrent(r);
    }
    setBusy(null);
  }

  return (
    <div style={{
      display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22,
      padding: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
    }}>
      <div style={{ flex: "0 0 100%", fontSize: 12, color: T.textMuted, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 }}>
        Comment cette vidéo te touche ?
      </div>
      {REACTIONS.map((r) => {
        const active = current === r.id;
        return (
          <button key={r.id} onClick={() => react(r.id)} disabled={busy !== null}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 14px",
              background: active ? T.violetSoft : "rgba(255,255,255,0.04)",
              color: T.text,
              border: `1px solid ${active ? T.gold : T.border}`,
              borderRadius: 999, fontSize: 14, fontWeight: 600,
              cursor: busy === null ? "pointer" : "wait",
              transition: "transform 120ms ease",
              transform: busy === r.id ? "scale(0.94)" : "none",
            }}>
            <span style={{ fontSize: 18 }}>{r.emoji}</span>
            <span>{r.label}</span>
            {counts[r.id] > 0 ? (
              <span style={{
                fontSize: 12, padding: "1px 7px", borderRadius: 999,
                background: active ? T.violet : "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 700,
              }}>{counts[r.id]}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
