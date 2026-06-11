'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';

const supabase = createClient();

interface Score {
  user_name: string;
  total_score: number;
  team_name: string;
}

export default function LeaderboardPage() {
  const [scores, setScores] = useState<Score[]>([]);

  useEffect(() => {
    async function fetchScores() {
      // On récupère les profils triés par score décroissant
      const { data } = await supabase
        .from('quiz_profiles')
        .select('user_name, total_score, quiz_teams(name)')
        .order('total_score', { ascending: false })
        .limit(10);

      if (data) {
        setScores(data.map((item: any) => ({
          user_name: item.user_name || 'Joueur Anonyme',
          total_score: item.total_score || 0,
          team_name: item.quiz_teams?.name || 'Sans équipe'
        })));
      }
    }
    fetchScores();
  }, []);

  return (
    <main className="p-6 md:p-12 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black text-white mb-8">🏆 Classement du Championnat</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {scores.map((s, index) => (
          <div key={index} className="flex justify-between p-4 border-b border-slate-800 last:border-0">
            <div className="flex items-center gap-4">
              <span className="font-mono text-amber-400 font-bold">#{index + 1}</span>
              <div>
                <p className="text-white font-bold">{s.user_name}</p>
                <p className="text-xs text-slate-500">{s.team_name}</p>
              </div>
            </div>
            <span className="text-xl font-black text-indigo-400">{s.total_score} pts</span>
          </div>
        ))}
      </div>
    </main>
  );
}