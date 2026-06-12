'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

// Instanciation hors composant pour éviter les re-renders en boucle.
const supabase = createClient();

// La question telle que vue par le joueur : SANS la bonne réponse
// (la vue quiz_questions_public ne l'expose jamais).
interface PublicQuestion {
  id: string;
  quiz_id: string;
  text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  is_difficult: boolean;
  reference?: string | null;
  sort_order: number;
}

interface Verdict {
  is_correct: boolean;
  points: number;
  correct_option: string | null;
  free_answer: string | null;
  reference: string | null;
}

const card: React.CSSProperties = {
  background: 'var(--card-bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)',
};
const pill = (bg: string, color: string): React.CSSProperties => ({
  fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
  background: bg, color, borderRadius: 'var(--radius-full)', padding: '4px 10px',
});

const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;

export default function PlayQuizClient({ quizId }: { quizId: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [freeAnswer, setFreeAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, missed: 0 });
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [locked, setLocked] = useState(false);
  const [started, setStarted] = useState(false);
  const timeLeftRef = useRef(10);
  const audioRef = useRef<AudioContext | null>(null);

  // Petit bip via Web Audio (pas de fichier à charger).
  const beep = useCallback((freq: number, dur: number, vol: number) => {
    try {
      const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!audioRef.current) audioRef.current = new AC();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.stop(ctx.currentTime + dur);
    } catch { /* audio indisponible */ }
  }, []);

  useEffect(() => {
    async function loadQuizData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/auth/login?redirect=/bible-quiz'); return; }
        await supabase.rpc('quiz_ensure_profile');

        const { data: quiz } = await supabase
          .from('quiz_quizzes').select('title, phase').eq('id', quizId).single();
        if (quiz) setQuizTitle(quiz.title);

        // Verrouillage par phase (le serveur applique la même règle).
        const phase = (quiz as { phase?: string } | null)?.phase;
        if (phase && phase !== 'libre') {
          const { data: ph, error: phErr } = await supabase
            .from('quiz_phases').select('is_open').eq('key', phase).maybeSingle();
          if (!phErr && ph && ph.is_open === false) { setLocked(true); return; }
        }

        const { data: questionsData } = await supabase
          .from('quiz_questions_public').select('*')
          .eq('quiz_id', quizId).order('sort_order', { ascending: true });
        setQuestions((questionsData as PublicQuestion[]) || []);
      } catch (error) {
        console.error('Erreur lors du chargement des données :', error);
      } finally {
        setLoading(false);
      }
    }
    if (quizId) loadQuizData();
  }, [quizId, router]);

  const currentQuestion = questions[currentIndex];
  const currentQuestionId = currentQuestion?.id;
  const isFreeInput = !!currentQuestion
    && !currentQuestion.option_a && !currentQuestion.option_b
    && !currentQuestion.option_c && !currentQuestion.option_d;

  const handleSelectOption = (letter: string) => {
    if (isAnswered) return;
    setSelectedAnswer(letter);
  };

  // Validation côté serveur. viaTimeout = déclenché par le chrono à 0.
  const submitAnswer = useCallback(async (viaTimeout = false) => {
    if (isAnswered || submitting || !currentQuestion) return;
    setSubmitting(true);
    setIsAnswered(true);
    const noInput = isFreeInput ? freeAnswer.trim() === '' : selectedAnswer === null;
    let v: Verdict;
    try {
      const { data, error } = await supabase.rpc('quiz_submit_answer', {
        p_quiz_id: quizId,
        p_question_id: currentQuestion.id,
        p_selected: selectedAnswer,
        p_free: isFreeInput ? freeAnswer : null,
        p_time_taken: 10 - timeLeftRef.current,
      });
      if (error) throw error;
      v = data as Verdict;
    } catch (err) {
      console.error("Erreur d'enregistrement de la réponse :", err);
      v = { is_correct: false, points: 0, correct_option: null, free_answer: null, reference: currentQuestion.reference ?? null };
    }
    const missed = viaTimeout && noInput;
    setVerdict(v);
    setTimedOut(missed);
    if (v.points) setScore((prev) => prev + v.points);
    setStats((s) => ({
      correct: s.correct + (v.is_correct ? 1 : 0),
      wrong: s.wrong + (!v.is_correct && !missed ? 1 : 0),
      missed: s.missed + (missed ? 1 : 0),
    }));
    setSubmitting(false);
  }, [isAnswered, submitting, currentQuestion, selectedAnswer, freeAnswer, isFreeInput, quizId]);

  // Ref vers la dernière version de submitAnswer (sans en faire une dépendance
  // du timer, sinon l'intervalle se relancerait à chaque frappe/clic).
  const submitRef = useRef(submitAnswer);
  useEffect(() => { submitRef.current = submitAnswer; }, [submitAnswer]);

  // Minuterie 10s — démarre après « Démarrer ». Bip sur les 3 dernières
  // secondes + bip plus grave à 0.
  useEffect(() => {
    if (loading || !currentQuestionId || quizFinished || isAnswered || !started) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev <= 1 ? 0 : prev - 1;
        timeLeftRef.current = next;
        if (next >= 1 && next <= 3) beep(880, 0.1, 0.18);
        if (next === 0) { beep(440, 0.35, 0.22); clearInterval(interval); submitRef.current(true); }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, currentQuestionId, quizFinished, isAnswered, started, beep]);

  const startTimer = () => {
    try { if (!audioRef.current) audioRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)(); audioRef.current?.resume(); } catch { /* noop */ }
    timeLeftRef.current = 10;
    setTimeLeft(10);
    setStarted(true);
  };

  const handleNext = async () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setFreeAnswer('');
      setIsAnswered(false);
      setVerdict(null);
      setTimedOut(false);
      setStarted(false);
      setTimeLeft(10);
      timeLeftRef.current = 10;
    } else {
      try {
        const { data } = await supabase.rpc('quiz_finish_attempt', { p_quiz_id: quizId });
        const res = data as { score?: number } | null;
        setFinalScore(res?.score ?? score);
      } catch (err) {
        console.error('Impossible de clôturer la manche :', err);
        setFinalScore(score);
      }
      setQuizFinished(true);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'qspin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Chargement du Championnat…</p>
        <style>{`@keyframes qspin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (locked) {
    return (
      <div style={{ ...card, padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🔒</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>Phase verrouillée</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '8px 0 18px' }}>Cette manche n&apos;est pas encore ouverte par l&apos;organisation.</p>
        <button onClick={() => router.push('/bible-quiz')}
          style={{ background: 'var(--gold)', color: '#1a0a00', fontWeight: 800, fontSize: 14, padding: '10px 22px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer' }}>
          Retour au championnat
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ ...card, padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>📖</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-title)' }}>Aucune question</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>Ce questionnaire est en cours de configuration par l&apos;organisation.</p>
      </div>
    );
  }

  if (!currentQuestion) return null;

  if (quizFinished) {
    const statCard = (emoji: string, label: string, value: number, color: string) => (
      <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', padding: '14px 8px', textAlign: 'center' }}>
        <div style={{ fontSize: 22 }}>{emoji}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      </div>
    );
    return (
      <div style={{ ...card, padding: '32px clamp(16px, 5vw, 24px)', textAlign: 'center' }}>
        <span style={{ fontSize: 52 }}>🏆</span>
        <h1 style={{ fontSize: 'clamp(21px, 6vw, 26px)', fontWeight: 800, margin: '12px 0 4px', color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>Manche terminée !</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Vos points ont été ajoutés au classement.</p>

        <div style={{ margin: '22px auto 18px', maxWidth: 240, background: 'var(--gold-pale)', border: '1px solid var(--gold)', borderRadius: 'var(--radius-lg)', padding: '14px 0' }}>
          <span style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, color: 'var(--gold-dark)' }}>Points marqués</span>
          <span style={{ fontSize: 38, fontWeight: 800, color: 'var(--gold-dark)', display: 'block', marginTop: 2 }}>+{finalScore ?? score} pts</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, maxWidth: 360, margin: '0 auto 8px' }}>
          {statCard('✅', 'Bonnes', stats.correct, 'var(--success)')}
          {statCard('❌', 'Ratées', stats.wrong, 'var(--error)')}
          {statCard('⏱️', 'Manquées', stats.missed, 'var(--text-secondary)')}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '6px 0 22px' }}>
          {stats.correct} / {questions.length} bonnes réponses
        </p>

        <button onClick={() => router.push('/bible-quiz')}
          style={{ background: 'var(--gold)', color: '#1a0a00', fontWeight: 800, fontSize: 14, padding: '12px 28px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-gold)' }}>
          Retour au championnat
        </button>
      </div>
    );
  }

  const timerCritical = timeLeft <= 3 && started;
  const ringColor = timerCritical ? 'var(--error)' : 'var(--gold)';
  const frac = Math.max(0, Math.min(1, timeLeft / 10));

  return (
    <div style={{ ...card, padding: '22px clamp(14px, 4vw, 20px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{ ...pill('var(--gold-pale)', 'var(--gold-dark)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flexShrink: 1 }}>{quizTitle}</span>
          {currentQuestion.is_difficult && <span style={{ ...pill('var(--violet-50)', 'var(--violet)'), flexShrink: 0 }}>🔥 Difficile</span>}
        </div>
        {/* Anneau circulaire de décompte */}
        <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
          <svg width="56" height="56" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={RING_R} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
            <circle cx="32" cy="32" r={RING_R} fill="none" stroke={ringColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - frac)} transform="rotate(-90 32 32)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
          </svg>
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 800, color: timerCritical ? 'var(--error)' : 'var(--text-primary)' }}>{timeLeft}</span>
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{ width: '100%', height: 6, background: 'var(--surface-2)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 22 }}>
        <div style={{ height: '100%', width: `${((currentIndex + 1) / questions.length) * 100}%`, background: 'var(--gold)', transition: 'width 0.3s' }} />
      </div>

      <h2 style={{ fontSize: 'clamp(15.5px, 4.5vw, 18px)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4, margin: '0 0 20px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 600, marginRight: 8 }}>Q{currentIndex + 1}.</span>
        {currentQuestion.text}
      </h2>

      {isFreeInput ? (
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 6 }}>Votre réponse (texte court)</label>
          <input
            type="text" disabled={isAnswered || !started} value={freeAnswer}
            onChange={(e) => setFreeAnswer(e.target.value)}
            placeholder="Écrivez votre réponse ici…"
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 14, color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-body)', opacity: (!started && !isAnswered) ? 0.5 : 1 }}
          />
          {isAnswered && verdict && (
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: verdict.is_correct ? 'var(--success)' : 'var(--error)' }}>
              {verdict.is_correct ? '✅ Bonne réponse !' : `❌ Réponse attendue : ${verdict.free_answer ?? '—'}`}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['A', 'B', 'C', 'D'].map((letter) => {
            const optionText = currentQuestion[`option_${letter.toLowerCase()}` as keyof PublicQuestion] as string | null;
            if (!optionText) return null;

            let bg = 'var(--surface-2)', border = 'var(--border)', color = 'var(--text-primary)', opacity = 1;
            if (!isAnswered && selectedAnswer === letter) { bg = 'var(--gold-pale)'; border = 'var(--gold)'; color = 'var(--gold-dark)'; }
            else if (isAnswered && verdict) {
              if (letter === verdict.correct_option?.toUpperCase().trim()) { bg = 'rgba(34,197,94,0.12)'; border = 'var(--success)'; color = 'var(--success)'; }
              else if (selectedAnswer === letter) { bg = 'rgba(239,68,68,0.10)'; border = 'var(--error)'; color = 'var(--error)'; }
              else { opacity = 0.5; }
            }
            if (!started && !isAnswered) opacity = 0.5;

            return (
              <button key={letter} disabled={isAnswered || !started} onClick={() => handleSelectOption(letter)}
                style={{ width: '100%', textAlign: 'left', padding: '13px 16px', borderRadius: 'var(--radius-md)', border: `1px solid ${border}`, background: bg, color, opacity, fontSize: 14, fontWeight: 600, cursor: (isAnswered || !started) ? 'default' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.12s' }}>
                <span style={{ fontWeight: 800, marginRight: 8 }}>{letter}.</span>{optionText}
              </button>
            );
          })}
        </div>
      )}

      {isAnswered && timedOut && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(239,68,68,0.10)', border: '1px solid var(--error)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--error)', fontWeight: 700 }}>
          ⏱️ Temps écoulé — question manquée
        </div>
      )}

      {isAnswered && verdict?.reference && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--gold-pale)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 12.5, color: 'var(--gold-dark)', fontWeight: 600 }}>
          📖 Écriture : {verdict.reference}
        </div>
      )}

      <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: (isAnswered || started) ? 'flex-end' : 'center' }}>
        {isAnswered ? (
          <button onClick={handleNext}
            style={{ background: 'var(--violet)', color: '#fff', fontWeight: 800, fontSize: 14, padding: '11px 26px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer' }}>
            {currentIndex + 1 === questions.length ? 'Voir mes résultats →' : 'Question suivante →'}
          </button>
        ) : !started ? (
          <button onClick={startTimer}
            style={{ background: 'var(--gold)', color: '#1a0a00', fontWeight: 800, fontSize: 15, padding: '13px 32px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-gold)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            ▶️ Démarrer le chrono
          </button>
        ) : (
          <button
            disabled={submitting || (!isFreeInput && selectedAnswer === null) || (isFreeInput && freeAnswer.trim() === '')}
            onClick={() => submitAnswer(false)}
            style={{ background: 'var(--gold)', color: '#1a0a00', fontWeight: 800, fontSize: 14, padding: '11px 26px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', opacity: (submitting || (!isFreeInput && selectedAnswer === null) || (isFreeInput && freeAnswer.trim() === '')) ? 0.4 : 1 }}>
            {submitting ? '…' : 'Valider'}
          </button>
        )}
      </div>
    </div>
  );
}
