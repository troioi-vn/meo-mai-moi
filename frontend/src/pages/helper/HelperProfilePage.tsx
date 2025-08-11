import { useQuery } from '@tanstack/react-query';
import { getHelperProfiles } from '@/api/helper-profiles';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function HelperProfilePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['helper-profiles'],
    queryFn: getHelperProfiles,
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error fetching helper profiles</div>;

  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">My Helper Profiles</h1>
        <Button onClick={() => navigate('/helper/create')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Helper Profile
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>City</TableHead>
            <TableHead>Public</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.data ?? []).map((profile: any) => (
            <TableRow key={profile.id}>
              <TableCell className="text-left">
                <Link to={`/helper/${profile.id}`}>
                    {profile.city}
                </Link>
              </TableCell>
              <TableCell className="text-left">{profile.is_public ? 'Yes' : 'No'}</TableCell>
              <TableCell className="text-left">
                <Link to={`/helper/${profile.id}/edit`}>
                  <Button variant="outline">Edit</Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}