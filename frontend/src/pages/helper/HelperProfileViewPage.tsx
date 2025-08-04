import { useQuery } from '@tanstack/react-query';
import { getHelperProfile } from '@/api/helper-profiles';
import { useParams } from 'react-router-dom';

export default function HelperProfileViewPage() {
  const { id } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['helper-profile', id],
    queryFn: () => getHelperProfile(id!),
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error fetching helper profile</div>;

  return (
    <div>
      <h1>{data.data.location}</h1>
      {/* Display other helper profile data */}
    </div>
  );
}
