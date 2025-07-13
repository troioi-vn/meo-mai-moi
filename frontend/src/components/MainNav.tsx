import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';

const MainNav: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  return (
    <header className="bg-neutral-50 dark:bg-neutral-900 shadow-lg">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Meo Mai Moi
        </Link>
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <Link to="/profile">
                <Button variant="ghost">Profile</Button>
              </Link>
              <Link to="/account/cats">
                <Button variant="ghost">My Cats</Button>
              </Link>
              <Button onClick={handleLogout}>Logout</Button>
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
