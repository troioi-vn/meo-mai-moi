import React from 'react'
import { Link } from 'react-router-dom'
import { HeroSection } from '@/components/HeroSection'
import { Button } from '@/components/ui/button' // Import the Button component

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <HeroSection />
      <div className="flex justify-center space-x-4 mt-8">
        <Link to="/login">
          <Button>Login</Button>
        </Link>
        <Link to="/register">
          <Button variant="outline">Register</Button>
        </Link>
      </div>
      {/* Add more content here as needed */}
    </div>
  )
}

export default HomePage
