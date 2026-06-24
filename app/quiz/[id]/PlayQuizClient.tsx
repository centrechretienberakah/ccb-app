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

interface AnswerResult {
  q: PublicQuestion;
  selected: string | null;   // lettre choisie (QCM) — null si manquée
  free: string;              // texte saisi (question ouverte)
  verdict: Verdict;
  missed: boolean;           // aucune réponse (timeout ou vide)
}

const QUESTION_SECONDS = 10;

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

const isFreeQuestion = (q: PublicQuestion) =>
  !q.option_a && !q.option_b && !q.option_c && !q.option_d;
const optionText = (q: PublicQuestion, letter: string | null) =>
  letter ? (q[`option_${letter.toLowerCase()}` as keyof PublicQuestion] as string | null) ?? null : null;

export default function PlayQuizClient({ quizId }: { quizId: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [freeAnswer, setFreeAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);

  const timeLeftRef = useRef(QUESTION_SECONDS);
  const freeAnswerRef = useRef('');
  const answeredRef = useRef<string | null>(null); // id de la question déjà traitée
  const audioRef = useRef<AudioContext | null>(null);
  useEffect(() => { freeAnswerRef.current = freeAnswer; }, [freeAnswer]);

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

  // ── Chargement ───────────────────────────────────────────────────────
  useEffect(() => {
    async function loadQuizData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/auth/login?redirect=/bible-quiz'); return; }
        await supabase.rpc('quiz_ensure_profile');

        const { data: quiz } = await supabase
          .from('quiz_quizzes').select('title, phase').eq('id', quizId).single();
        if (quiz) setQuizTitle(quiz.title);

        const phase = (quiz as { phase?: string } | null)?.phase;
        if (phase && phase !== 'libre') {
          // Verrou par progression : 1re phase = ouverture admin ; suivantes =
          // ≥90% à la phase précédente (le serveur applique la même règle).
          const { data: unlocked } = await supabase.rpc('quiz_phase_unlocked', { p_phase: phase });
          if (unlocked === false) { setLocked(true); return; }
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

  // ── Réponse + passage automatique à la suivante ──────────────────────
  const handleAnswer = useCallback(async (selected: string | null) => {
    const q = questions[currentIndex];
    if (!q || answeredRef.current === q.id) return;
    answeredRef.current = q.id;

    const free = isFreeQuestion(q) ? freeAnswerRef.current.trim() : '';
    const noInput = isFreeQuestion(q) ? free === '' : selected === null;

    let v: Verdict;
    try {
      const { data, error } = await supabase.rpc('quiz_submit_answer', {
        p_quiz_id: quizId,
        p_question_id: q.id,
        p_selected: selected,
        p_free: isFreeQuestion(q) ? free : null,
        p_time_taken: QUESTION_SECONDS - timeLeftRef.current,
      });
      if (error) throw error;
      v = data as Verdict;
    } catch (err) {
      console.error("Erreur d'enregistrement de la réponse :", err);
      v = { is_correct: false, points: 0, correct_option: null, free_answer: null, reference: q.reference ?? null };
    }

    if (v.points) setScore((p) => p + v.points);
    setResults((prev) => [...prev, { q, selected: noInput ? null : selected, free, verdict: v, missed: noInput }]);

    if (currentIndex + 1 < questions.length) {
      setFreeAnswer('');
      freeAnswerRef.current = '';
      setCurrentIndex((p) => p + 1);
    } else {
      try {
        const { data } = await supabase.rpc('quiz_finish_attempt', { p_quiz_id: quizId });
        setFinalScore((data as { score?: number } | null)?.score ?? null);
      } catch (err) {
        console.error('Impossible de clôturer la manche :', err);
      }
      setQuizFinished(true);
    }
  }, [questions, currentIndex, quizId]);

  const handleRef = useRef(handleAnswer);
  useEffect(() => { handleRef.current = handleAnswer; }, [handleAnswer]);

  // ── Chrono 10 s par question — DÉMARRE AUTOMATIQUEMENT, se relance à
  //    chaque question, et passe à la suivante (manquée) à 0. ───────────
  useEffect(() => {
    if (loading || locked || quizFinished || !currentQuestion) return;
    // Tente de réveiller l'audio (sera effectif dès la 1re interaction).
    try { audioRef.current?.resume(); } catch { /* noop */ }
    setTimeLeft(QUESTION_SECONDS);
    timeLeftRef.current = QUESTION_SECONDS;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev <= 1 ? 0 : prev - 1;
        timeLeftRef.current = next;
        if (next >= 1 && next <= 3) beep(880, 0.1, 0.18);
        if (next === 0) { beep(440, 0.35, 0.22); clearInterval(interval); handleRef.current(null); }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex, loading, locked, quizFinished, currentQuestion, beep]);

  // ── États de bord ────────────────────────────────────────────────────
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

  // ── RÉCAP FINAL ──────────────────────────────────────────────────────
  if (quizFinished) {
    const correct = results.filter((r) => r.verdict.is_correct).length;
    const missed = results.filter((r) => r.missed).length;
    const wrong = results.length - correct - missed;

    const statCard = (emoji: string, label: string, value: number, color: string) => (
      <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', padding: '14px 8px', textAlign: 'center' }}>
        <div style={{ fontSize: 22 }}>{emoji}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      </div>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Bilan */}
        <div style={{ ...card, padding: '32px clamp(16px, 5vw, 24px)', textAlign: 'center' }}>
          <span style={{ fontSize: 52 }}>🏆</span>
          <h1 style={{ fontSize: 'clamp(21px, 6vw, 26px)', fontWeight: 800, margin: '12px 0 4px', color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>Manche terminée !</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Vos points ont été ajoutés au classement.</p>

          <div style={{ margin: '22px auto 18px', maxWidth: 240, background: 'var(--gold-pale)', border: '1px solid var(--gold)', borderRadius: 'var(--radius-lg)', padding: '14px 0' }}>
            <span style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, color: 'var(--gold-dark)' }}>Points marqués</span>
            <span style={{ fontSize: 38, fontWeight: 800, color: 'var(--gold-dark)', display: 'block', marginTop: 2 }}>+{finalScore ?? score} pts</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, maxWidth: 360, margin: '0 auto 8px' }}>
            {statCard('✅', 'Bonnes', correct, 'var(--success)')}
            {statCard('❌', 'Ratées', wrong, 'var(--error)')}
            {statCard('⏱️', 'Manquées', missed, 'var(--text-secondary)')}
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '6px 0 0' }}>
            {correct} / {questions.length} bonnes réponses
          </p>
        </div>

        {/* Correction question par question */}
        <div style={{ ...card, padding: '20px clamp(14px, 4vw, 20px)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-title)', margin: '0 0 14px' }}>📝 Correction</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((r, i) => {
              const good = r.verdict.is_correct;
              const yourMcq = optionText(r.q, r.selected);
              const correctMcq = optionText(r.q, r.verdict.correct_option);
              const accent = good ? 'var(--success)' : r.missed ? 'var(--text-muted)' : 'var(--error)';
              return (
                <div key={r.q.id} style={{ background: 'var(--surface-2)', border: `1px solid ${good ? 'rgba(34,197,94,0.35)' : r.missed ? 'var(--border)' : 'rgba(239,68,68,0.30)'}`, borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{good ? '✅' : r.missed ? '⏱️' : '❌'}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginRight: 6 }}>Q{i + 1}.</span>{r.q.text}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: accent, fontWeight: 600, marginLeft: 24 }}>
                    {r.missed
                      ? 'Aucune réponse (temps écoulé)'
                      : isFreeQuestion(r.q)
                        ? <>Votre réponse : « {r.free} »</>
                        : <>Votre réponse : <b>{r.selected}.</b> {yourMcq}</>}
                  </div>

                  {!good && (
                    <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600, marginLeft: 24, marginTop: 3 }}>
                      Bonne réponse : {isFreeQuestion(r.q)
                        ? <b>{r.verdict.free_answer ?? '—'}</b>
                        : <><b>{r.verdict.correct_option}.</b> {correctMcq ?? '—'}</>}
                    </div>
                  )}

                  {r.verdict.reference && (
                    <div style={{ fontSize: 12, color: 'var(--gold-dark)', fontWeight: 600, marginLeft: 24, marginTop: 4 }}>
                      📖 {r.verdict.reference}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => router.push('/bible-quiz')}
            style={{ marginTop: 18, width: '100%', background: 'var(--gold)', color: '#1a0a00', fontWeight: 800, fontSize: 14, padding: '12px 0', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-gold)' }}>
            Retour au championnat
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  // ── ÉCRAN DE JEU ─────────────────────────────────────────────────────
  const isFree = isFreeQuestion(currentQuestion);
  const timerCritical = timeLeft <= 3;
  const ringColor = timerCritical ? 'var(--error)' : 'var(--gold)';
  const frac = Math.max(0, Math.min(1, timeLeft / QUESTION_SECONDS));

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
      <div style={{ width: '100%', height: 6, background: 'var(--surface-2)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', width: `${((currentIndex + 1) / questions.length) * 100}%`, background: 'var(--gold)', transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right', marginBottom: 18 }}>
        Question {currentIndex + 1} / {questions.length}
      </div>

      <h2 style={{ fontSize: 'clamp(15.5px, 4.5vw, 18px)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4, margin: '0 0 20px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 600, marginRight: 8 }}>Q{currentIndex + 1}.</span>
        {currentQuestion.text}
      </h2>

      {isFree ? (
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 6 }}>Votre réponse (Entrée pour valider)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text" autoFocus value={freeAnswer}
              onChange={(e) => setFreeAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && freeAnswer.trim() !== '') handleAnswer(null); }}
              placeholder="Écrivez votre réponse ici…"
              style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 14, color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-body)' }}
            />
            <button
              disabled={freeAnswer.trim() === ''}
              onClick={() => handleAnswer(null)}
              style={{ background: 'var(--gold)', color: '#1a0a00', fontWeight: 800, fontSize: 14, padding: '0 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: freeAnswer.trim() === '' ? 'default' : 'pointer', opacity: freeAnswer.trim() === '' ? 0.4 : 1, flexShrink: 0 }}>
              →
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['A', 'B', 'C', 'D'].map((letter) => {
            const opt = optionText(currentQuestion, letter);
            if (!opt) return null;
            return (
              <button key={letter} onClick={() => handleAnswer(letter)}
                style={{ width: '100%', textAlign: 'left', padding: '13px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.12s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'var(--gold-pale)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)'; }}>
                <span style={{ fontWeight: 800, marginRight: 8 }}>{letter}.</span>{opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
