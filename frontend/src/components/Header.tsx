import { Link } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';

export function Header() {
  const { user } = useAuth();

  return (
    <header className="w-full border-b px-4 md:px-8 py-4 flex justify-between items-center">
      <Link to="/" className="font-bold text-lg">
        Meo Mai Moi
      </Link>
      {user ? (
        <UserMenu />
      ) : (
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Register</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
