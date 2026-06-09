import Link from "next/link";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";

export interface FollowMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

/**
 * Vue liste d'abonnés / abonnements (présentational, réutilisée par les
 * deux pages). Chaque membre est cliquable vers son profil.
 */
export default function FollowListView({
  title, members, backHref, emptyLabel,
}: {
  title: string;
  members: FollowMember[];
  backHref: string;
  emptyLabel: string;
}) {
  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body, paddingBottom: 60 }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "22px 16px" }}>
        <Link href={backHref} style={{
          display: "inline-block", background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 8, padding: "6px 12px", color: T.violet,
          fontSize: 12, fontWeight: 700, textDecoration: "none", marginBottom: 18,
        }}>← Retour au profil</Link>

        <h1 style={{
          fontFamily: F.title, fontSize: 22, fontWeight: 700, color: T.text,
          margin: "0 0 16px",
        }}>{title}</h1>

        {members.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "40px 16px", color: T.textMuted, fontSize: 14,
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
          }}>{emptyLabel}</div>
        ) : (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden",
          }}>
            {members.map((m, i) => {
              const initials = (m.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Link key={m.user_id} href={`/community/profil/${m.user_id}`} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", textDecoration: "none", color: T.text,
                  borderTop: i === 0 ? "none" : `1px solid ${T.borderSoft}`,
                }}>
                  {m.avatar_url ? (
                    <img loading="lazy" decoding="async" src={m.avatar_url} alt={m.display_name || ""}
                      style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 700, fontSize: 15,
                    }}>{initials}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: T.text }}>
                      {m.display_name || "Membre"}
                    </div>
                    {m.bio && (
                      <div style={{
                        fontSize: 12, color: T.textMuted, marginTop: 2,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 420,
                      }}>{m.bio}</div>
                    )}
                  </div>
                  <span style={{ color: T.violet, fontSize: 13, fontWeight: 700 }}>→</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
