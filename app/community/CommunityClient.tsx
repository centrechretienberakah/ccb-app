"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Member {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cell_group: string | null;
  testimony: string | null;
}

interface Props {
  members: Member[];
  currentUserId: string;
}

export default function CommunityClient({ members, currentUserId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterCell, setFilterCell] = useState("");

  // Groupes uniques pour le filtre
  const cellGroups = [...new Set(members.map((m) => m.cell_group).filter(Boolean))];

  const filtered = members.filter((m) => {
    const name = (m.display_name || "").toLowerCase();
    const cell = (m.cell_group || "").toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || cell.includes(search.toLowerCase());
    const matchCell = !filterCell || m.cell_group === filterCell;
    return matchSearch && matchCell;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e0d0", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "rgba(10,10,10,0.96)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid #1a1a1a", padding: "16px",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{
            background: "#1a1a1a", border: "1px solid #2a2a2a",
            borderRadius: 10, padding: "8px 14px", color: "#d4af37",
            fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0
          }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#d4af37" }}>Communauté CCB</div>
            <div style={{ fontSize: 12, color: "#666" }}>{members.length} membre{members.length > 1 ? "s" : ""}</div>
          </div>
          <a href="/profile" style={{
            background: "#1a1a1a", border: "1px solid #2a2a2a",
            borderRadius: 10, padding: "8px 14px", color: "#888",
            fontSize: 13, cursor: "pointer", textDecoration: "none"
          }}>Mon profil</a>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 80px" }}>

        {/* Barre de recherche */}
        <div style={{ marginBottom: 14 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Rechercher un membre..."
            style={{
              width: "100%", background: "#111", border: "1px solid #222",
              borderRadius: 12, padding: "12px 16px", color: "#e8e0d0",
              fontSize: 14, boxSizing: "border-box"
            }}
          />
        </div>

        {/* Filtre groupes */}
        {cellGroups.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <button
              onClick={() => setFilterCell("")}
              style={{
                background: !filterCell ? "#d4af37" : "#1a1a1a",
                border: `1px solid ${!filterCell ? "#d4af37" : "#333"}`,
                borderRadius: 20, padding: "6px 14px",
                color: !filterCell ? "#000" : "#888",
                fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}
            >Tous</button>
            {cellGroups.map((g) => (
              <button
                key={g!}
                onClick={() => setFilterCell(g === filterCell ? "" : g!)}
                style={{
                  background: filterCell === g ? "rgba(212,175,55,0.2)" : "#1a1a1a",
                  border: `1px solid ${filterCell === g ? "#d4af37" : "#333"}`,
                  borderRadius: 20, padding: "6px 14px",
                  color: filterCell === g ? "#d4af37" : "#888",
                  fontSize: 12, cursor: "pointer"
                }}
              >{g}</button>
            ))}
          </div>
        )}

        {/* État vide */}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
            <div style={{ color: "#888", fontSize: 15 }}>
              {members.length === 0
                ? "Aucun profil public pour l'instant. Crée le tien !"
                : "Aucun membre ne correspond à cette recherche."}
            </div>
            {members.length === 0 && (
              <a href="/profile" style={{
                display: "inline-block", marginTop: 20,
                background: "linear-gradient(135deg, #d4af37, #c9a227)",
                color: "#000", fontWeight: 700, borderRadius: 12,
                padding: "12px 24px", textDecoration: "none", fontSize: 14
              }}>Créer mon profil</a>
            )}
          </div>
        )}

        {/* Grille de membres */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {filtered.map((member) => {
            const isMe = member.user_id === currentUserId;
            const initials = (member.display_name || "?")
              .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div
                key={member.user_id}
                onClick={() => isMe && router.push("/profile")}
                style={{
                  background: "#111",
                  border: `1px solid ${isMe ? "#d4af37" : "#1a1a1a"}`,
                  borderRadius: 16, padding: 16, cursor: isMe ? "pointer" : "default",
                  position: "relative"
                }}
              >
                {isMe && (
                  <div style={{
                    position: "absolute", top: 10, right: 10,
                    background: "#d4af37", color: "#000",
                    borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700
                  }}>MOI</div>
                )}
                {/* Avatar */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" style={{
                      width: 64, height: 64, borderRadius: "50%",
                      objectFit: "cover", border: "2px solid #333"
                    }} />
                  ) : (
                    <div style={{
                      width: 64, height: 64, borderRadius: "50%",
                      background: "linear-gradient(135deg, #d4af37, #c9a227)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, fontWeight: 700, color: "#000"
                    }}>{initials}</div>
                  )}
                </div>
                {/* Nom */}
                <div style={{ textAlign: "center", fontWeight: 700, fontSize: 14, color: "#f0e8d0", marginBottom: 4 }}>
                  {member.display_name || "Membre"}
                </div>
                {/* Cellule */}
                {member.cell_group && (
                  <div style={{ textAlign: "center", marginBottom: 8 }}>
                    <span style={{
                      background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)",
                      borderRadius: 20, padding: "2px 10px", fontSize: 10, color: "#d4af37"
                    }}>👥 {member.cell_group}</span>
                  </div>
                )}
                {/* Bio courte */}
                {member.bio && (
                  <p style={{
                    fontSize: 12, color: "#777", textAlign: "center",
                    lineHeight: 1.5, margin: 0,
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical"
                  } as any}>{member.bio}</p>
                )}
                {/* Témoignage badge */}
                {member.testimony && (
                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: "#555" }}>✨ A un témoignage</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
