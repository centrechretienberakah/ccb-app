'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

// SOLUTION ANTIMATRICE : Instanciation à l'extérieur pour bloquer la boucle infinie de re-renders
const supabase = createClient();

interface Question {
  id: string;
  quiz_id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  free_answer?: string;
  is_difficult: boolean;
  sort_order: number;
  reference?: string;
}

export default function PlayQuizClient({ quizId }: { quizId: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [freeAnswer, setFreeAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    async function loadQuizData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/register');
          return;
        }
        setUserId(user.id);

        const { data: profile } = await supabase
          .from('quiz_profiles')
          .select('team_id')
          .eq('id', user.id)
          .single();
        if (profile) setTeamId(profile.team_id);

        const { data: quiz } = await supabase
          .from('quiz_quizzes')
          .select('title')
          .eq('id', quizId)
          .single();

        if (quiz) setQuizTitle(quiz.title);

        const { data: questionsData } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('sort_order', { ascending: true });

        setQuestions(questionsData || []);
      } catch (error) {
        console.error('Erreur lors du chargement des données :', error);
      } finally {
        setLoading(false);
      }
    }

    if (quizId) loadQuizData();
  }, [quizId, router]);

  const handleSelectOption = (letter: string) => {
    if (isAnswered) return;
    setSelectedAnswer(letter);
  };

  const handleTimeout = useCallback(async (questionId: string) => {
    setIsAnswered(true);
    try {
      await supabase.from('quiz_answers').insert({
        user_id: userId,
        team_id: teamId,
        quiz_id: quizId,
        question_id: questionId,
        selected_option: null,
        selected_free_answer: null,
        is_correct: false,
        time_taken: 10
      });
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du timeout :", err);
    }
  }, [userId, teamId, quizId]);

  const currentQuestion = questions[currentIndex];
  const currentQuestionId = currentQuestion?.id;

  useEffect(() => {
    if (loading || !currentQuestionId || quizFinished || isAnswered) return;

    setTimeLeft(10);
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeout(currentQuestionId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, currentQuestionId, quizFinished, isAnswered, handleTimeout]);

  const handleValidate = useCallback(async () => {
    if (isAnswered || !currentQuestion) return;

    let isCorrect = false;

    if (currentQuestion.correct_option?.toLowerCase() === 'free') {
      isCorrect = freeAnswer.trim().toLowerCase() === currentQuestion.free_answer?.trim().toLowerCase();
    } else {
      isCorrect = selectedAnswer?.toLowerCase() === currentQuestion.correct_option?.toLowerCase().trim();
    }

    const pointsGained = isCorrect ? (currentQuestion.is_difficult ? 2 : 1) : 0;
    if (isCorrect) {
      setScore((prev) => prev + pointsGained);
    }

    setIsAnswered(true);

    try {
      await supabase.from('quiz_answers').insert({
        user_id: userId,
        team_id: teamId,
        quiz_id: quizId,
        question_id: currentQuestion.id,
        selected_option: selectedAnswer,
        selected_free_answer: freeAnswer,
        is_correct: isCorrect,
        time_taken: 10 - timeLeft
      });
    } catch (err) {
      console.error("Erreur d'enregistrement de la réponse :", err);
    }
  }, [isAnswered, currentQuestion, freeAnswer, selectedAnswer, userId, teamId, quizId, timeLeft]);

  const handleNext = async () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setFreeAnswer('');
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
      if (userId) {
        try {
          await supabase.from('quiz_attempts').insert({
            user_id: userId,
            quiz_id: quizId,
            score: score
          });

          const { data: profile } = await supabase
            .from('quiz_profiles')
            .select('total_score')
            .eq('id', userId)
            .single();

          const newTotalScore = (profile?.total_score || 0) + score;

          let computedLevel = 'debutant';
          if (newTotalScore >= 500) computedLevel = 'expert';
          else if (newTotalScore >= 300) computedLevel = 'avancé';
          else if (newTotalScore >= 100) computedLevel = 'intermediaire';

          await supabase
            .from('quiz_profiles')
            .update({ total_score: newTotalScore, level: computedLevel })
            .eq('id', userId);

          if (teamId) {
            const { data: teamData } = await supabase
              .from('quiz_teams')
              .select('total_score')
              .eq('id', teamId)
              .single();

            await supabase
              .from('quiz_teams')
              .update({ total_score: (teamData?.total_score || 0) + score })
              .eq('id', teamId);
          }
        } catch (err) {
          console.error('Impossible de sauvegarder le score final :', err);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center text-slate-100">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-sm">Chargement du Championnat...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center max-w-md shadow-xl w-full">
          <h2 className="text-xl font-bold text-amber-400">Aucune Question</h2>
          <p className="text-slate-400 text-sm mt-2">Ce questionnaire est en cours de configuration par l'organisation.</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;
  const isFreeInput = currentQuestion.correct_option?.toLowerCase() === 'free';

  return (
    <div className="w-full block py-12 px-4 md:px-8 font-sans">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl mx-auto">
        
        {quizFinished ? (
          <div className="text-center py-6">
            <span className="text-5xl">🏆</span>
            <h1 className="text-3xl font-black mt-4 tracking-tight text-white">Étape Validée !</h1>
            <p className="text-slate-400 text-sm mt-1">Vos points ont été ajoutés au classement général.</p>
            
            <div className="my-6 bg-slate-950 border border-slate-800 rounded-2xl py-4 max-w-xs mx-auto">
              <span className="block text-xs uppercase tracking-widest font-bold text-slate-500">Points Marqués</span>
              <span className="text-4xl font-black text-amber-400 mt-1 block">+{score} pts</span>
            </div>

            <button onClick={() => router.push('/bible-quiz')} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm px-8 py-3.5 rounded-xl transition shadow-lg">
              Retour au Dashboard
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider bg-amber-400/10 px-3 py-1 rounded-full truncate max-w-45">
                  {quizTitle}
                </span>
                {currentQuestion.is_difficult && (
                  <span className="text-xs font-bold text-purple-400 uppercase bg-purple-500/10 px-3 py-1 rounded-full">
                    🔥 Difficile (+2)
                  </span>
                )}
              </div>
              <div className={`text-sm font-black px-3 py-1 rounded-lg border transition ${timeLeft <= 3 ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
                ⏱️ {timeLeft}s
              </div>
            </div>

            <div className="w-full h-1.5 bg-slate-950 rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>

            <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-100 mb-6 leading-snug">
              <span className="text-slate-500 text-base font-medium mr-2">Q{currentIndex + 1}.</span>
              {currentQuestion.text}
            </h2>

            {isFreeInput ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Votre réponse (Texte court) :</label>
                <input
                  type="text"
                  disabled={isAnswered}
                  value={freeAnswer}
                  onChange={(e) => setFreeAnswer(e.target.value)}
                  placeholder="Écrivez votre réponse ici..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            ) : (
              <div className="space-y-2.5">
                {['A', 'B', 'C', 'D'].map((letter) => {
                  const optionText = currentQuestion[`option_${letter.toLowerCase()}` as keyof Question] as string;
                  if (!optionText) return null;

                  let optionStyle = "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300";
                  
                  if (!isAnswered && selectedAnswer === letter) {
                    optionStyle = "bg-amber-500/10 border-amber-500 text-amber-400";
                  } else if (isAnswered) {
                    if (letter === currentQuestion.correct_option?.toUpperCase().trim()) {
                      optionStyle = "bg-green-500/10 border-green-500 text-green-400 font-semibold";
                    } else if (selectedAnswer === letter) {
                      optionStyle = "bg-red-500/10 border-red-500 text-red-400";
                    } else {
                      optionStyle = "bg-slate-950/40 border-slate-900 text-slate-600 opacity-50";
                    }
                  }

                  return (
                    <button
                      key={letter}
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(letter)}
                      className={`w-full text-left p-3.5 rounded-xl border text-sm transition font-medium flex items-center justify-between gap-4 ${optionStyle}`}
                    >
                      <span>{letter}. {optionText}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {isAnswered && currentQuestion.reference && (
              <div className="mt-4 p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-amber-400/90 font-medium">
                📖 Écriture : {currentQuestion.reference}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-end">
              {!isAnswered ? (
                <button
                  disabled={!isFreeInput && selectedAnswer === null}
                  onClick={handleValidate}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-bold text-sm px-6 py-2.5 rounded-xl transition"
                >
                  Valider
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm px-6 py-2.5 rounded-xl transition border border-slate-700"
                >
                  {currentIndex + 1 === questions.length ? 'Terminer la manche' : 'Question Suivante →'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}