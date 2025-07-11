import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center">
      <div className="container px-4 md:px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight mb-4">
          Find Your Feline Friend Today
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8">
          Connecting cats in need with loving fosters and adopters in your community.
        </p>
        {/* Call to action buttons can go here */}
      </div>
    </section>
  );
};

export default HeroSection;