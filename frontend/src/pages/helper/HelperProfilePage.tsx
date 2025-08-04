import { useQuery } from '@tanstack/react-query';
import { getHelperProfiles } from '@/api/helper-profiles';
import { Link } from 'react-router-dom';

export default function HelperProfilePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['helper-profiles'],
    queryFn: getHelperProfiles,
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error fetching helper profiles</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold">My Helper Profiles</h1>
      <Link to="/helper/create" className="btn btn-primary">
        Create Helper Profile
      </Link>
      <ul>
        {data.data.map((profile: any) => (
          <li key={profile.id}>
            <Link to={`/helper/${profile.id}`}>{profile.location}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
