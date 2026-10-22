import Link from 'next/link';
import { Nav } from '@/components/Nav';

export default function FeedbackThanksPage({ searchParams }: { searchParams: { type?: string; error?: string; demo?: string } }) {
  const demo = searchParams.demo === '1';

  return (
    <>
      <Nav />
      <main className="page-shell max-w-lg py-16 md:py-20">
        <div className="card focus-card p-7 text-center sm:p-9">
          <p className="eyebrow mb-3">Feedback received</p>
          <h1 className="text-3xl font-bold">{searchParams.error ? 'Feedback link expired' : 'Thanks'}</h1>
          <p className="mx-auto mt-3 max-w-sm leading-6 text-muted">
            {searchParams.error
              ? 'Open Atlus to give feedback directly.'
              : demo
                ? 'This is a local demo, so your feedback was not saved anywhere.'
                : 'Atlus will use this to improve future recommendations.'}
          </p>
          <Link className="btn-primary mt-6" href="/today">Back to Atlus</Link>
        </div>
      </main>
    </>
  );
}
