import { CatCard } from '@/components/CatCard';

export function CatsSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl font-bold tracking-tighter text-center mb-8 text-neutral-900 dark:text-neutral-100">
          Cats Looking for Homes Now
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          <CatCard
            id="1"
            name="Whiskers"
            breed="Siamese"
            age={2}
            location="New York, NY"
            imageUrl="https://via.placeholder.com/300x200?text=Whiskers"
          />
          <CatCard
            id="2"
            name="Mittens"
            breed="Persian"
            age={4}
            location="Los Angeles, CA"
            imageUrl="https://via.placeholder.com/300x200?text=Mittens"
          />
          <CatCard
            id="3"
            name="Shadow"
            breed="Bombay"
            age={1}
            location="Chicago, IL"
            imageUrl="https://via.placeholder.com/300x200?text=Shadow"
          />
          <CatCard
            id="4"
            name="Tiger"
            breed="Tabby"
            age={3}
            location="Houston, TX"
            imageUrl="https://via.placeholder.com/300x200?text=Tiger"
          />
        </div>
      </div>
    </section>
  );
}
