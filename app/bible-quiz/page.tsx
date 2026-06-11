'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import Link from 'next/link';

const supabase = createClient();

export default function BibleQuizHub() {
  const [activeQuiz, setActiveQuiz] = useState<any>(null);

  useEffect(() => {
    async function fetchActiveQuiz() {
      const { data } = await supabase
        .from('quiz_quizzes')
        .select('*')
        .eq('is_active', true)
        .single();
      
      setActiveQuiz(data);
    }
    fetchActiveQuiz();
  }, []);

  return (
    <main className="p-6 md:p-12 max-w-4xl mx-auto text-white">
      <h1 className="text-3xl font-black mb-8">Bible Quiz Championship</h1>
      
      {/* Carte de la manche en cours */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8">
        <h2 className="text-xl font-bold mb-4">Manche actuelle</h2>
        {activeQuiz ? (
          <div>
            <p className="text-indigo-400 font-bold mb-4">{activeQuiz.title}</p>
            <Link 
              href={`/quiz/${activeQuiz.id}`}
              className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold transition"
            >
              Rejoindre la manche
            </Link>
          </div>
        ) : (
          <p className="text-slate-400">Aucune manche active pour le moment. Préparez-vous pour la prochaine !</p>
        )}
      </div>

      {/* Navigation rapide */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/leaderboard" className="p-6 bg-slate-800 rounded-2xl text-center hover:bg-slate-700 transition">
          🏆 Voir le classement
        </Link>
        <Link href="/team" className="p-6 bg-slate-800 rounded-2xl text-center hover:bg-slate-700 transition">
          👥 Gérer mon équipe
        </Link>
      </div>
    </main>
  );
}