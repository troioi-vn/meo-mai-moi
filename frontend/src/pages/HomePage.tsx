
import React from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '../components/HeroSection';

const HomePage: React.FC = () => {
  return (
    <div className="homepage">
      <HeroSection />
      <div className="flex justify-center space-x-4 mt-8">
        <Link to="/login" className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-300">Login</Link>
        <Link to="/register" className="px-6 py-3 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 transition duration-300">Register</Link>
      </div>
      {/* Add more content here as needed */}
    </div>
  );
};

export default HomePage;
