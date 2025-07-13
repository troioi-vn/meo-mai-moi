import LoginForm from '@/components/LoginForm';
import { HomeButton } from '@/components/HomeButton';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
      <div className="absolute top-4 left-4">
        <HomeButton />
      </div>
      <div className="w-full max-w-md p-8 space-y-8 bg-neutral-50 rounded-lg shadow-lg dark:bg-neutral-800">
        <h1 className="text-2xl font-bold text-center text-neutral-900 dark:text-neutral-100">Login</h1>
        <LoginForm />
      </div>
    </div>
  );
}
