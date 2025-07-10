import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <section className="hero-section" style={{ backgroundColor: 'lightblue', padding: '20px', textAlign: 'center' }}>
      <h1>Find Your Feline Friend Today!</h1>
      <p>Connecting cats in need with loving homes.</p>
      <button>Browse Available Cats</button>
    </section>
  );
};

export default HeroSection;
