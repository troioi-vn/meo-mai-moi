import React from 'react';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/FileInput';
import { CheckboxField } from '@/components/ui/CheckboxField';
import { FormField } from '@/components/ui/FormField';
import useHelperProfileForm from '@/hooks/useHelperProfileForm';

const CreateHelperProfilePage: React.FC = () => {
  const { formData, setFormData, errors, isSubmitting, updateField, handleSubmit, handleCancel } =
    useHelperProfileForm(null, {
        country: '',
        address: '',
        city: '',
        state: '',
        phone_number: '',
        experience: '',
        has_pets: false,
        has_children: false,
        can_foster: false,
        can_adopt: false,
        is_public: true,
        photos: [],
    });

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <h1 className="text-3xl font-bold text-center text-card-foreground mb-6">Create Helper Profile</h1>
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
                <Button type="submit" aria-label="Create Helper Profile" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default CreateHelperProfilePage;
