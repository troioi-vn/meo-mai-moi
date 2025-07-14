import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { UserMenu } from './UserMenu';

const MainNav: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <Link to="/" className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Meo Mai Moi
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Register</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default MainNav;
