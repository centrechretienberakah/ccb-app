'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

interface Question {
  id: string;
  quiz_id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  is_difficult: boolean;
  sort_order: number;
}

// Correction Next.js 16 : Récupération et déballage obligatoire de la Promise params
export default function PlayQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const quizId = unwrappedParams.id;
  
  const router = useRouter();
  const supabase = createClient();

  const [hasMounted, setHasMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const optionLetters = ['a', 'b', 'c', 'd'];

  useEffect(() => {
    setHasMounted(true);

    async function loadQuizData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/register');
          return;
        }
        setUserId(user.id);

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
  }, [quizId, router, supabase]);

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
  };

  const handleValidate = () => {
    if (selectedAnswer === null || isAnswered) return;
    
    const currentQuestion = questions[currentIndex];
    const selectedLetter = optionLetters[selectedAnswer];
    const correctLetter = currentQuestion.correct_option?.toLowerCase().trim();
    
    if (selectedLetter === correctLetter) {
      setScore((prev) => prev + 10);
    }
    setIsAnswered(true);
  };

  const handleNext = async () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
      if (userId) {
        try {
          const { data: profile } = await supabase
            .from('quiz_profiles')
            .select('total_score')
            .eq('id', userId)
            .single();

          const currentTotal = profile?.total_score || 0;

          await supabase
            .from('quiz_profiles')
            .update({ total_score: currentTotal + score })
            .eq('id', userId);
        } catch (err) {
          console.error('Impossible de sauvegarder le score final :', err);
        }
      }
    }
  };

  if (!hasMounted) return null;

  if (loading) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center text-slate-100">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-sm">Préparation des questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center max-w-md shadow-xl w-full">
          <h2 className="text-xl font-bold text-amber-400">Quiz vide !</h2>
          <p className="text-slate-400 text-sm mt-2">Ce questionnaire ne contient aucune question actuellement.</p>
          <button onClick={() => router.push('/bible-quiz')} className="mt-6 bg-slate-800 hover:bg-slate-700 text-sm font-bold px-5 py-2.5 rounded-xl transition text-white">
            Retour au Tableau de Bord
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;
  
  const currentOptions = [
    currentQuestion.option_a,
    currentQuestion.option_b,
    currentQuestion.option_c,
    currentQuestion.option_d
  ];

  const correctIndex = optionLetters.indexOf(currentQuestion.correct_option?.toLowerCase().trim());

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] flex items-center justify-center p-2 md:p-6 font-sans">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl my-auto">
        
        {quizFinished ? (
          <div className="text-center py-6">
            <span className="text-5xl">👑</span>
            <h1 className="text-3xl font-black mt-4 tracking-tight text-white">Quiz Terminé !</h1>
            <p className="text-slate-400 text-sm mt-1">Félicitations pour avoir complété : <br/><span className="text-amber-400 font-semibold">{quizTitle}</span></p>
            
            <div className="my-6 bg-slate-950 border border-slate-800 rounded-2xl py-4 max-w-xs mx-auto">
              <span className="block text-xs uppercase tracking-widest font-bold text-slate-500">Score accumulé</span>
              <span className="text-4xl font-black text-green-400 mt-1 block">+{score} pts</span>
            </div>

            <button
              onClick={() => router.push('/bible-quiz')}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm px-8 py-3.5 rounded-xl transition shadow-lg"
            >
              Retourner à l'Arène
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4 gap-4">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider bg-amber-400/10 px-3 py-1 rounded-full truncate max-w-45 md:max-w-75">
                {quizTitle}
              </span>
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                Question {currentIndex + 1} / {questions.length}
              </span>
            </div>

            <div className="w-full h-1.5 bg-slate-950 rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>

            <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-100 mb-6 leading-snug">
              {currentQuestion.text}
            </h2>

            <div className="space-y-2.5">
              {currentOptions.map((option, index) => {
                let optionStyle = "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300";
                
                if (!isAnswered && selectedAnswer === index) {
                  optionStyle = "bg-amber-500/10 border-amber-500 text-amber-400";
                } else if (isAnswered) {
                  if (index === correctIndex) {
                    optionStyle = "bg-green-500/10 border-green-500 text-green-400 font-semibold";
                  } else if (selectedAnswer === index) {
                    optionStyle = "bg-red-500/10 border-red-500 text-red-400";
                  } else {
                    optionStyle = "bg-slate-950/40 border-slate-900 text-slate-600 opacity-50";
                  }
                }

                return (
                  <button
                    key={index}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(index)}
                    className={`w-full text-left p-3.5 rounded-xl border text-sm transition font-medium flex items-center justify-between gap-4 ${optionStyle}`}
                  >
                    <span>{option}</span>
                    {isAnswered && index === correctIndex && <span className="text-green-400 font-bold shrink-0">✓</span>}
                    {isAnswered && selectedAnswer === index && index !== correctIndex && <span className="text-red-400 font-bold shrink-0">✗</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-end">
              {!isAnswered ? (
                <button
                  disabled={selectedAnswer === null}
                  onClick={handleValidate}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-bold text-sm px-6 py-2.5 rounded-xl transition"
                >
                  Valider la réponse
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm px-6 py-2.5 rounded-xl transition border border-slate-700"
                >
                  {currentIndex + 1 === questions.length ? 'Terminer le Quiz' : 'Question Suivante →'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}