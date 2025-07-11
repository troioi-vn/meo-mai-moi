import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import { useNavigate } from 'react-router-dom';

const AccountPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleAccountDeleted = () => {
    // Redirect to home or login page after account deletion
    navigate('/login');
  };

  if (isLoading) {
    return <div>Loading user data...</div>;
  }

  if (!isAuthenticated || !user) {
    return <div>You need to be logged in to view this page.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Account</h1>
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Profile Information</h2>
        <p className="text-lg mb-2"><strong>Name:</strong> {user.name}</p>
        <p className="text-lg mb-2"><strong>Email:</strong> {user.email}</p>
        {/* Add more user variables here as needed */}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Change Password</h2>
        <ChangePasswordForm />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Danger Zone</h2>
        <DeleteAccountDialog onAccountDeleted={handleAccountDeleted} />
      </div>
    </div>
  );
};

export default AccountPage;
