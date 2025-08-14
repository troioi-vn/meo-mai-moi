import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createHelperProfile, updateHelperProfile } from '@/api/helper-profiles';
import { toast } from 'sonner';

type HelperProfileForm = {
  country: string;
  address: string;
  city: string;
  state: string;
  phone_number: string;
  experience: string;
  has_pets: boolean;
  has_children: boolean;
  can_foster: boolean;
  can_adopt: boolean;
  is_public: boolean;
  status?: string;
  photos: FileList | File[] | [];
};

type ApiError = { response?: { data?: { errors?: Record<string, string> } } };

const useHelperProfileForm = (profileId?: number, initialData?: Partial<HelperProfileForm>) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<HelperProfileForm>({
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
      ...initialData,
    });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Only set the form data if we are on the edit page and the initial data has been loaded.
    if (profileId && initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData, profileId]);

  const createMutation = useMutation({
    mutationFn: createHelperProfile,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['helper-profiles'] });
      toast.success(profileId ? 'Helper profile updated successfully!' : 'Helper profile created successfully!');
      navigate(`/helper/${String(data.data.id)}`);
    },
    onError: (error: ApiError) => {
      setErrors(error.response?.data?.errors ?? {});
      toast.error(profileId ? 'Failed to update helper profile. Please try again.' : 'Failed to create helper profile. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateHelperProfile,
    onSuccess: (_data: any) => {
      queryClient.invalidateQueries({ queryKey: ['helper-profiles'] });
      if (profileId) {
        queryClient.invalidateQueries({ queryKey: ['helper-profile', profileId] });
      }
      toast.success('Helper profile updated successfully!');
      if (profileId) {
        navigate(`/helper/${String(profileId)}`);
      }
    },
    onError: (error: ApiError) => {
      setErrors(error.response?.data?.errors ?? {});
      toast.error('Failed to update helper profile. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const updateField = (field: keyof HelperProfileForm) => (valueOrEvent: unknown) => {
    let value: unknown;
    if (valueOrEvent && typeof valueOrEvent === 'object' && 'target' in (valueOrEvent as any)) {
      const { target } = valueOrEvent as {
        target: { type?: string; checked?: boolean; files?: FileList; value?: unknown };
      };
      if (target.type === 'checkbox') {
        value = Boolean(target.checked);
      } else if (target.files) {
        value = target.files;
      } else {
        value = target.value;
      }
    } else {
      value = valueOrEvent;
    }
    setFormData((prev) => ({ ...prev, [field]: value as any }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.country) newErrors.country = 'Country is required';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.phone_number) newErrors.phone_number = 'Phone number is required';
    if (!formData.experience) newErrors.experience = 'Experience is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    const dataToSend = new FormData();
    const fieldsToSubmit = [
      'country',
      'address',
      'city',
      'state',
      'phone_number',
      'experience',
      'has_pets',
      'has_children',
      'can_foster',
      'can_adopt',
      'is_public',
      'status',
    ];

    fieldsToSubmit.forEach((key) => {
      const value = formData[key as keyof HelperProfileForm] as unknown;
      if (key === 'photos' && value instanceof FileList) {
        for (let i = 0; i < value.length; i++) {
          dataToSend.append('photos[]', value[i]);
        }
      } else if (typeof value === 'boolean') {
        dataToSend.append(key, value ? '1' : '0');
      } else if (value !== null && value !== undefined) {
        dataToSend.append(key, String(value));
      }
    });

    if (profileId) {
      updateMutation.mutate({ id: profileId, data: dataToSend } as any);
    } else {
      createMutation.mutate(dataToSend as any);
    }
  };

  const handleCancel = () => {
    navigate('/helper');
  };

  return {
    formData,
    errors,
    isSubmitting,
    updateField,
    handleSubmit,
    handleCancel,
  };
};

export default useHelperProfileForm;
