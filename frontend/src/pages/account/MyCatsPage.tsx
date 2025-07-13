import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyCats } from '@/api/cats';
import type { Cat } from "@/types/cat";
import { Button } from '@/components/ui/button';
import { CatCard } from '@/components/CatCard';

const MyCatsPage: React.FC = () => {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getMyCats();
        setCats(response);
      } catch (err) {
        setError('Failed to fetch cats.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCats();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 bg-neutral-50 dark:bg-neutral-900 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">My Cats</h1>
        <Link data-discover="true" to="/account/cats/create">
          <Button>Add Cat</Button>
        </Link>
      </div>
      {loading && <p className="flex justify-center items-center min-h-screen text-lg">Loading...</p>}
      {error && <p className="flex justify-center items-center min-h-screen text-lg text-error">{error}</p>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {cats.length > 0 ? (
            cats.map(cat => (
              <CatCard
                key={cat.id}
                id={cat.id.toString()}
                name={cat.name}
                breed={cat.breed}
                age={cat.age}
                location={cat.location}
                imageUrl={cat.imageUrl}
              />
            ))
          ) : (
            <p className="text-neutral-700 dark:text-neutral-300 col-span-full text-center">You haven't added any cats yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MyCatsPage;
