'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

const supabase = createClient();

interface QuizAdmin {
  id: string;
  title: string;
  is_active: boolean;
  questions_count?: number;
  answers_count?: number;
}

export default function QuizControlClient() {
  const [quizzes, setQuizzes] = useState<QuizAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchAdminData() {
    try {
      const { data: quizzesData, error: qError } = await supabase
        .from('quiz_quizzes')
        .select('id, title, is_active');

      if (qError) throw qError;

      if (quizzesData) {
        const fullData = await Promise.all(
          quizzesData.map(async (quiz) => {
            const { count: qCount } = await supabase
              .from('quiz_questions')
              .select('*', { count: 'exact', head: true })
              .eq('quiz_id', quiz.id);

            const { count: aCount } = await supabase
              .from('quiz_answers')
              .select('*', { count: 'exact', head: true })
              .eq('quiz_id', quiz.id);

            return {
              ...quiz,
              questions_count: qCount || 0,
              answers_count: aCount || 0,
            };
          })
        );
        setQuizzes(fullData);
      }
    } catch {
      console.error('Erreur de récupération admin');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdminData();
  }, []);

  const toggleQuizStatus = async (id: string, currentStatus: boolean) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('quiz_quizzes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      setQuizzes((prev) =>
        prev.map((q) => (q.id === id ? { ...q, is_active: !currentStatus } : q))
      );
    } catch {
      alert("Erreur lors du changement d'état du quiz.");
    } finally {
      setActionLoading(null);
    }
  };

  const resetQuizAnswers = async (id: string) => {
    if (!confirm('⚠️ ATTENTION : Cela va supprimer TOUTES les réponses des joueurs pour ce quiz. Continuer ?')) return;
    setActionLoading(id + '-reset');
    try {
      const { error: answersError } = await supabase
        .from('quiz_answers')
        .delete()
        .eq('quiz_id', id);

      const { error: attemptsError } = await supabase
        .from('quiz_attempts')
        .delete()
        .eq('quiz_id', id);

      if (answersError || attemptsError) throw new Error('Erreur');

      alert('Toutes les réponses de ce questionnaire ont été réinitialisées !');
      fetchAdminData();
    } catch {
      alert('Erreur lors du nettoyage des réponses.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-slate-400 text-sm">Chargement du panneau d'administration...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 px-3 py-1 rounded-full">
            Espace Super-Admin
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white mt-2">
            Contrôle du Championnat
          </h1>
        </div>
      </div>

      <div className="grid gap-4">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 flex-1">
              <h3 className="text-lg font-bold text-slate-100">{quiz.title}</h3>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">Questions: {quiz.questions_count}</span>
                <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">Réponses: {quiz.answers_count}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                disabled={actionLoading === quiz.id}
                onClick={() => toggleQuizStatus(quiz.id, quiz.is_active)}
                className={`text-xs font-bold px-4 py-2 rounded-xl ${quiz.is_active ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}
              >
                {quiz.is_active ? 'Désactiver' : 'Activer'}
              </button>
              <button
                onClick={() => resetQuizAnswers(quiz.id)}
                className="bg-slate-800 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}