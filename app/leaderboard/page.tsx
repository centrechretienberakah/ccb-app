'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';

const supabase = createClient();

interface Score { name: string; total_score: number; level: string; team_name: string; }

const LEVEL_LABEL: Record<string, string> = {
  debutant: 'Débutant', intermediaire: 'Intermédiaire', 'avancé': 'Avancé', expert: 'Expert',
};

export default function LeaderboardPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScores() {
      const { data } = await supabase
        .from('quiz_profiles')
        .select('name, total_score, level, quiz_teams(name)')
        .order('total_score', { ascending: false })
        .limit(20);

      if (data) {
        setScores((data as Record<string, unknown>[]).map((item) => ({
          name: (item.name as string) || 'Joueur',
          total_score: (item.total_score as number) || 0,
          level: (item.level as string) || 'debutant',
          team_name: ((item.quiz_teams as { name?: string } | null)?.name) || 'Sans équipe',
        })));
      }
      setLoading(false);
    }
    fetchScores();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-8">🏆 Classement du Championnat</h1>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : scores.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucun score enregistré pour le moment. Sois le premier à jouer !</p>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {scores.map((s, index) => (
              <div key={index} className="flex justify-between items-center p-4 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-amber-400 font-bold w-8">#{index + 1}</span>
                  <div>
                    <p className="text-white font-bold">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.team_name} · {LEVEL_LABEL[s.level] ?? 'Débutant'}</p>
                  </div>
                </div>
                <span className="text-xl font-black text-indigo-400">{s.total_score} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
