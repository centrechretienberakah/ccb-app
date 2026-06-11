'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import Link from 'next/link';

const supabase = createClient();

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
}
interface MyStats { total_score: number; level: string; team_id: string | null; }

const LEVEL_LABEL: Record<string, string> = {
  debutant: 'Débutant', intermediaire: 'Intermédiaire', 'avancé': 'Avancé', expert: 'Expert',
};

const card: React.CSSProperties = {
  background: 'var(--card-bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)',
};

export default function BibleQuizHub() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login?redirect=/bible-quiz'); return; }

      const { data: profile } = await supabase.rpc('quiz_ensure_profile');
      const p = profile as MyStats | null;
      if (p) {
        setStats(p);
        if (p.team_id) {
          const { data: team } = await supabase.from('quiz_teams').select('name').eq('id', p.team_id).single();
          setTeamName(team?.name ?? null);
        }
      }

      const { data: list } = await supabase
        .from('quiz_quizzes')
        .select('id, title, description, category, difficulty, is_active, sort_order')
        .order('sort_order', { ascending: true });
      const rows = (list as (Quiz & { is_active: boolean })[] | null) ?? [];
      setQuizzes(rows);
      setActiveId(rows.find((q) => q.is_active)?.id ?? null);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'qspin 0.8s linear infinite' }} />
        <style>{`@keyframes qspin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const activeQuiz = quizzes.find((q) => q.id === activeId) ?? null;
  const stat = (label: string, value: string, color: string) => (
    <div style={{ ...card, padding: '14px 10px', textAlign: 'center' }}>
      <span style={{ display: 'block', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 800, color, display: 'block', marginTop: 2 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px 96px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 22 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--gold-pale)', color: 'var(--gold-dark)', borderRadius: 'var(--radius-full)', padding: '4px 12px' }}>Bootcamp Berakah</span>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '12px 0 0', fontFamily: 'var(--font-title)' }}>🏆 Bible Quiz Championship</h1>
      </div>

      {/* Mes stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
        {stat('Score', String(stats?.total_score ?? 0), 'var(--gold-dark)')}
        {stat('Niveau', LEVEL_LABEL[stats?.level ?? 'debutant'] ?? 'Débutant', 'var(--violet)')}
        {stat('Équipe', teamName ?? '—', 'var(--text-primary)')}
      </div>

      {/* Manche actuelle */}
      <div style={{ ...card, padding: '20px 22px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px' }}>Manche actuelle</h2>
        {activeQuiz ? (
          <div>
            <p style={{ color: 'var(--violet)', fontWeight: 800, margin: '0 0 4px', fontSize: 15 }}>{activeQuiz.title}</p>
            {activeQuiz.description && <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: '0 0 14px' }}>{activeQuiz.description}</p>}
            <Link href={`/quiz/${activeQuiz.id}`}
              style={{ display: 'inline-block', background: 'var(--gold)', color: '#1a0a00', fontWeight: 800, fontSize: 14, padding: '11px 24px', borderRadius: 'var(--radius-full)', textDecoration: 'none', boxShadow: 'var(--shadow-gold)' }}>
              Rejoindre la manche →
            </Link>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Aucune manche active pour le moment. Préparez-vous pour la prochaine !</p>
        )}
      </div>

      {/* Toutes les manches */}
      {quizzes.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-secondary)', margin: '0 0 12px' }}>Toutes les manches</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {quizzes.map((q) => (
              <Link key={q.id} href={`/quiz/${q.id}`}
                style={{ ...card, padding: '14px 16px', textDecoration: 'none', display: 'block' }}>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontSize: 14 }}>{q.title}</p>
                {q.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>{q.description}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Nav rapide */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Link href="/leaderboard" style={{ ...card, padding: '18px', textAlign: 'center', textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>🏆 Voir le classement</Link>
        <Link href="/team" style={{ ...card, padding: '18px', textAlign: 'center', textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>👥 Gérer mon équipe</Link>
      </div>
    </div>
  );
}
