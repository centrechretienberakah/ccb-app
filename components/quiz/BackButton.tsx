'use client';

import { useRouter } from 'next/navigation';

// Bouton « retour à la page précédente » partagé par toute la rubrique Bible Quiz.
export default function BackButton({ label = 'Retour' }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--gold)', fontWeight: 700, fontSize: 13.5,
        padding: '4px 2px', marginBottom: 10, fontFamily: 'var(--font-body)',
      }}
    >
      ← {label}
    </button>
  );
}
