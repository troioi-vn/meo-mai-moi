import { CatCard } from '@/components/CatCard'

export function CatsSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl font-bold tracking-tighter text-center mb-8 text-foreground">
          Cats Looking for Homes Now
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          <CatCard
            id="1"
            name="Whiskers"
            breed="Siamese"
            birthday="2023-01-01" // 2 years old in 2025
            location="New York, NY"
            imageUrl="https://via.placeholder.com/300x200?text=Whiskers"
          />
          <CatCard
            id="2"
            name="Mittens"
            breed="Persian"
            birthday="2021-01-01" // 4 years old in 2025
            location="Los Angeles, CA"
            imageUrl="https://via.placeholder.com/300x200?text=Mittens"
          />
          <CatCard
            id="3"
            name="Shadow"
            breed="Bombay"
            birthday="2024-01-01" // 1 year old in 2025
            location="Chicago, IL"
            imageUrl="https://via.placeholder.com/300x200?text=Shadow"
          />
          <CatCard
            id="4"
            name="Tiger"
            breed="Tabby"
            birthday="2022-01-01" // 3 years old in 2025
            location="Houston, TX"
            imageUrl="https://via.placeholder.com/300x200?text=Tiger"
          />
        </div>
      </div>
    </section>
  )
}
