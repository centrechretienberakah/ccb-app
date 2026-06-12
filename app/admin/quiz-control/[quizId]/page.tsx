import QuizEditorClient from './QuizEditorClient';

interface PageProps {
  params: Promise<{ quizId: string }>;
}

export default async function QuizEditorPage({ params }: PageProps) {
  const { quizId } = await params;
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px 96px' }}>
      <QuizEditorClient quizId={quizId} />
    </main>
  );
}
