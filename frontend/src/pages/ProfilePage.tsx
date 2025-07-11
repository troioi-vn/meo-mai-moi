import React from 'react';
import { useAuth } from '@/hooks/useAuth';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
      <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <p className="text-lg text-gray-700 dark:text-gray-300"><span className="font-semibold">Name:</span> {user.name}</p>
        <p className="text-lg text-gray-700 dark:text-gray-300 mt-4"><span className="font-semibold">Email:</span> {user.email}</p>
      </div>
    </div>
  );
};

export default ProfilePage;
