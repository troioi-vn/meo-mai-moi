import { useQuery } from '@tanstack/react-query';
import { getHelperProfile } from '@/api/helper-profiles';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export default function HelperProfileViewPage() {
  const { id } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['helper-profile', id],
    queryFn: () => getHelperProfile(id!),
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error fetching helper profile</div>;
  const d = data!; // data is defined here due to early returns

  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-8">
  <h1 className="text-3xl font-bold text-foreground">{d.data.user?.name ?? 'User'}'s Helper Profile</h1>
        <div>
          <Link to={`/helper/${id}/edit`}>
            <Button variant="outline" className="mr-2">Edit</Button>
          </Link>
          <Link to="/helper">
            <Button>Back to List</Button>
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <table className="min-w-full border border-gray-300 rounded-md overflow-hidden">
          <tbody>
            <tr className="border-b"><td className="font-semibold px-4 py-2">Country</td><td className="px-4 py-2">{d.data.country}</td></tr>
            <tr className="border-b"><td className="font-semibold px-4 py-2">City</td><td className="px-4 py-2">{d.data.city}</td></tr>
            <tr className="border-b"><td className="font-semibold px-4 py-2">State</td><td className="px-4 py-2">{d.data.state}</td></tr>
            <tr className="border-b"><td className="font-semibold px-4 py-2">Experience</td><td className="px-4 py-2">{d.data.experience}</td></tr>
            <tr className="border-b"><td className="font-semibold px-4 py-2">Has Pets</td><td className="px-4 py-2">{d.data.has_pets ? 'Yes' : 'No'}</td></tr>
            <tr className="border-b"><td className="font-semibold px-4 py-2">Has Children</td><td className="px-4 py-2">{d.data.has_children ? 'Yes' : 'No'}</td></tr>
            <tr className="border-b"><td className="font-semibold px-4 py-2">Can Foster</td><td className="px-4 py-2">{d.data.can_foster ? 'Yes' : 'No'}</td></tr>
            <tr><td className="font-semibold px-4 py-2">Can Adopt</td><td className="px-4 py-2">{d.data.can_adopt ? 'Yes' : 'No'}</td></tr>
          </tbody>
        </table>
        <div>
          <Carousel className="w-full max-w-xs">
            <CarouselContent>
              {(d.data.photos ?? []).map((photo: any) => (
                <CarouselItem key={photo.id}>
                  <img src={`http://localhost:8000/storage/${photo.path}`} alt="Helper profile photo" className="w-full h-full object-cover" />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>
    </div>
  );
}
