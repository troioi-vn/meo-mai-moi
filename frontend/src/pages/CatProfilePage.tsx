import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CommentsSection from '../components/CommentsSection';

interface Cat {
  id: number;
  name: string;
  breed: string;
  age: number;
  description: string;
  location: string;
}

const CatProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [cat, setCat] = useState<Cat | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCat = async () => {
      try {
        const response = await fetch(`/api/cats/${id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCat(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCat();
  }, [id]);

  if (loading) {
    return <div>Loading cat profile...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!cat) {
    return <div>Cat not found.</div>;
  }

  return (
    <div>
      <h1>{cat.name}</h1>
      <p>Breed: {cat.breed}</p>
      <p>Age: {cat.age}</p>
      <p>Location: {cat.location}</p>
      <p>Description: {cat.description}</p>

      {cat.id && <CommentsSection catId={cat.id} />}
    </div>
  );
};

export default CatProfilePage;
