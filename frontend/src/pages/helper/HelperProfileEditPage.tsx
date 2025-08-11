import React from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { CheckboxField } from '@/components/ui/CheckboxField';
import { FileInput } from '@/components/ui/FileInput';
import useHelperProfileForm from '@/hooks/useHelperProfileForm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHelperProfile, deleteHelperProfile, deleteHelperProfilePhoto } from '@/api/helper-profiles';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const HelperProfileEditPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['helper-profile', id],
    queryFn: () => getHelperProfile(id!),
  });

  const numericId = id ? Number(id) : undefined;
  const initialFormData = data?.data
    ? {
        country: data.data.country ?? '',
        address: data.data.address ?? '',
        city: data.data.city ?? '',
        state: data.data.state ?? '',
        phone_number: data.data.phone_number ?? data.data.phone ?? '',
        experience: data.data.experience ?? '',
        has_pets: Boolean(data.data.has_pets),
        has_children: Boolean(data.data.has_children),
        can_foster: Boolean(data.data.can_foster),
        can_adopt: Boolean(data.data.can_adopt),
        is_public: Boolean(data.data.is_public),
        status: data.data.status,
        photos: [],
      }
    : undefined;
  const { formData, errors, isSubmitting, updateField, handleSubmit, handleCancel } =
    useHelperProfileForm(numericId, initialFormData);

  const deleteMutation = useMutation({
    mutationFn: () => deleteHelperProfile(id!),
    onSuccess: () => {
      navigate('/helper');
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: number) => deleteHelperProfilePhoto(id!, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helper-profile', id] });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error fetching helper profile</div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <h1 className="text-3xl font-bold text-center text-card-foreground mb-6">Edit Helper Profile</h1>
        <div className="grid grid-cols-3 gap-4">
          {data?.data?.photos?.map((photo: any) => (
            <div key={photo.id} className="relative">
              <img src={`http://localhost:8000/storage/${photo.path}`} alt="Helper profile photo" className="w-full h-full object-cover" />
              <Button
                  aria-label={`Delete photo ${photo.id}`}
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => { deletePhotoMutation.mutate(photo.id); }}
                  disabled={deletePhotoMutation.isPending}
                >
                  Delete
                </Button>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <FormField id="country" label="Country" value={formData.country} onChange={updateField('country')} error={errors.country} placeholder="Enter your country" />
            <FormField id="address" label="Address" value={formData.address} onChange={updateField('address')} error={errors.address} placeholder="Enter your address" />
            <FormField id="city" label="City" value={formData.city} onChange={updateField('city')} error={errors.city} placeholder="Enter your city" />
            <FormField id="state" label="State" value={formData.state} onChange={updateField('state')} error={errors.state} placeholder="Enter your state" />
            <FormField id="phone_number" label="Phone Number" value={formData.phone_number} onChange={updateField('phone_number')} error={errors.phone_number} placeholder="Enter your phone number" />
            <FormField id="experience" label="Experience" type="textarea" value={formData.experience} onChange={updateField('experience')} error={errors.experience} placeholder="Describe your experience" />
            <CheckboxField id="has_pets" label="Has Pets" checked={formData.has_pets} onChange={updateField('has_pets')} error={errors.has_pets} />
            <CheckboxField id="has_children" label="Has Children" checked={formData.has_children} onChange={updateField('has_children')} error={errors.has_children} />
            <CheckboxField id="can_foster" label="Can Foster" checked={formData.can_foster} onChange={updateField('can_foster')} error={errors.can_foster} />
            <CheckboxField id="can_adopt" label="Can Adopt" checked={formData.can_adopt} onChange={updateField('can_adopt')} error={errors.can_adopt} />
            <CheckboxField id="is_public" label="Is Public" checked={formData.is_public} onChange={updateField('is_public')} error={errors.is_public} />
            <FileInput id="photos" label="Photos" onChange={updateField('photos')} error={errors.photos} multiple />

            <div className="flex gap-4">
                <Button type="submit" aria-label="Update Helper Profile" disabled={isSubmitting}>
                    {isSubmitting ? 'Updating...' : 'Update'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" disabled={deleteMutation.isPending}>
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your helper profile.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { deleteMutation.mutate(); }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
        </form>
      </div>
    </div>
  );
};

export default HelperProfileEditPage;