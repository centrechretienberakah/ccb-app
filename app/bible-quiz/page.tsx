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

      // Profil quiz unifié (créé à la volée depuis le compte CCB).
      const { data: profile } = await supabase.rpc('quiz_ensure_profile');
      const p = profile as MyStats | null;
      if (p) {
        setStats(p);
        if (p.team_id) {
          const { data: team } = await supabase.from('quiz_teams').select('name').eq('id', p.team_id).single();
          setTeamName(team?.name ?? null);
        }
      }

      // Tous les quiz + repère la manche active (tolère 0 ou plusieurs).
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
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const activeQuiz = quizzes.find((q) => q.id === activeId) ?? null;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full">
          Bootcamp Berakah
        </span>
        <h1 className="text-3xl font-black mb-6 mt-3">Bible Quiz Championship</h1>

        {/* Mes stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="block text-xs uppercase tracking-wider text-slate-500 font-bold">Score</span>
            <span className="text-2xl font-black text-amber-400">{stats?.total_score ?? 0}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="block text-xs uppercase tracking-wider text-slate-500 font-bold">Niveau</span>
            <span className="text-lg font-bold text-indigo-400">{LEVEL_LABEL[stats?.level ?? 'debutant'] ?? 'Débutant'}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="block text-xs uppercase tracking-wider text-slate-500 font-bold">Équipe</span>
            <span className="text-sm font-bold text-slate-200">{teamName ?? '—'}</span>
          </div>
        </div>

        {/* Manche en cours */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold mb-4">Manche actuelle</h2>
          {activeQuiz ? (
            <div>
              <p className="text-indigo-400 font-bold mb-1">{activeQuiz.title}</p>
              {activeQuiz.description && <p className="text-slate-400 text-sm mb-4">{activeQuiz.description}</p>}
              <Link href={`/quiz/${activeQuiz.id}`} className="inline-block bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold transition">
                Rejoindre la manche
              </Link>
            </div>
          ) : (
            <p className="text-slate-400">Aucune manche active pour le moment. Préparez-vous pour la prochaine !</p>
          )}
        </div>

        {/* Toutes les manches */}
        {quizzes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-3 text-slate-300">Toutes les manches</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {quizzes.map((q) => (
                <Link key={q.id} href={`/quiz/${q.id}`}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition">
                  <p className="font-bold text-slate-100">{q.title}</p>
                  {q.description && <p className="text-xs text-slate-500 mt-1">{q.description}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Navigation rapide */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/leaderboard" className="p-6 bg-slate-800 rounded-2xl text-center hover:bg-slate-700 transition">
            🏆 Voir le classement
          </Link>
          <Link href="/team" className="p-6 bg-slate-800 rounded-2xl text-center hover:bg-slate-700 transition">
            👥 Gérer mon équipe
          </Link>
        </div>
      </div>
    </main>
  );
}
