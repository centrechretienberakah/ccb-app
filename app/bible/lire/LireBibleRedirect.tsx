"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BibleClient from "../BibleClient";

interface Props {
  user: any;
  notes: any[];
  savedVerses: any[];
}

export default function LireBibleRedirect({ user, notes, savedVerses }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [lastPos, setLastPos] = useState<{ book: string; chapter: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ccb-bible-last");
      if (raw) {
        const pos = JSON.parse(raw) as { book: string; chapter: number };
        if (pos.book && pos.chapter) {
          setLastPos(pos);
          // Redirection automatique vers le dernier chapitre lu
          router.replace(`/bible/read/${encodeURIComponent(pos.book)}/${pos.chapter}`);
          return;
        }
      }
    } catch {
      // localStorage indisponible ou données corrompues
    }
    setChecking(false);
  }, [router]);

  // Pendant la vérification / redirection — écran bref
  if (checking) {
    return (
      <div style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "var(--font-body)",
      }}>
        <div style={{ fontSize: 40 }}>📖</div>
        {lastPos ? (
          <>
            <p style={{ color: "var(--text-secondary)", fontSize: 15, margin: 0 }}>
              Reprise de lecture…
            </p>
            <p style={{ color: "var(--gold)", fontSize: 13, fontWeight: 700, margin: 0 }}>
              {lastPos.book} {lastPos.chapter}
            </p>
          </>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            Chargement…
          </p>
        )}
      </div>
    );
  }

  // Pas de position sauvegardée — afficher le sélecteur normalement
  return <BibleClient user={user} notes={notes} savedVerses={savedVerses} />;
}
