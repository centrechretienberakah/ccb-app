import PlayQuizClient from './PlayQuizClient';
import BackButton from '@/components/quiz/BackButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlayQuizPage({ params }: PageProps) {
  const resolvedParams = await params;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 96px' }}>
      <BackButton />
      <PlayQuizClient quizId={resolvedParams.id} />
    </main>
  );
}
