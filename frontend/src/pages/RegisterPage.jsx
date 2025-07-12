import RegisterForm from '@/components/RegisterForm';
import { HomeButton } from '@/components/HomeButton';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const navigate = useNavigate();

  const handleRegistrationSuccess = () => {
    toast.success("You are registered, now login please.");
    navigate('/login');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="absolute top-4 left-4">
        <HomeButton />
      </div>
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Create an Account</h1>
        <RegisterForm onSuccess={handleRegistrationSuccess} />
      </div>
    </div>
  );
}
