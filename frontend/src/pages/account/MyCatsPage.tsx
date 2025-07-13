import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyCats } from '@/api/cats';
import type { Cat } from "@/types/cat";
import { Button } from '@/components/ui/button';

const MyCatsPage: React.FC = () => {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const userCats = await getMyCats();
        setCats(userCats);
      } catch (err) {
        setError('Failed to fetch cats.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCats();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Cats</h1>
        <Link to="/account/cats/create">
          <Button>Add Cat</Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cats.map(cat => (
          <div key={cat.id} className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-2">{cat.name}</h2>
            <p className="text-gray-600">{cat.breed}</p>
            <p className="text-gray-600">{cat.location}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyCatsPage;
