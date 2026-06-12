import QuizControlClient from './QuizControlClient';
import BackButton from '@/components/quiz/BackButton';

export default function AdminControlPage() {
  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '24px 16px 96px' }}>
      <BackButton />
      <QuizControlClient />
    </main>
  );
}
