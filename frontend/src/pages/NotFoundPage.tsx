import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-neutral-100 dark:bg-neutral-900">
      <h1 className="text-9xl font-bold text-primary">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Page Not Found</h2>
      <p className="mt-2 text-neutral-700 dark:text-neutral-300">
        The page you are looking for does not exist.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Go to Homepage</Link>
      </Button>
    </div>
  );
}
