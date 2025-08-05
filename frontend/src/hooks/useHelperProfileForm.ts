import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createHelperProfile, updateHelperProfile } from '@/api/helper-profiles';
import { toast } from 'sonner';

const useHelperProfileForm = (profileId, initialData) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(
    initialData || {
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
    }
  );
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Only set the form data if we are on the edit page and the initial data has been loaded.
    if (profileId && initialData) {
      setFormData(initialData);
    }
  }, [initialData, profileId]);

  const mutation = useMutation({
    mutationFn: profileId ? updateHelperProfile : createHelperProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['helper-profiles'] });
      if (profileId) {
        queryClient.invalidateQueries({ queryKey: ['helper-profile', profileId] });
      }
      toast.success(profileId ? 'Helper profile updated successfully!' : 'Helper profile created successfully!');
      if (profileId) {
        navigate(`/helper/${profileId}`);
      } else {
        navigate(`/helper/${data.data.id}`);
      }
    },
    onError: (error) => {
      setErrors(error.response.data.errors);
      toast.error(profileId ? 'Failed to update helper profile. Please try again.' : 'Failed to create helper profile. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const updateField = (field) => (valueOrEvent) => {
    let value;
    if (valueOrEvent && valueOrEvent.target) {
      const { target } = valueOrEvent;
      if (target.type === 'checkbox') {
        value = target.checked;
      } else if (target.files) {
        value = target.files;
      } else {
        value = target.value;
      }
    } else {
      value = valueOrEvent;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.country) newErrors.country = 'Country is required';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.phone_number) newErrors.phone_number = 'Phone number is required';
    if (!formData.experience) newErrors.experience = 'Experience is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
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

    fieldsToSubmit.forEach(key => {
      const value = formData[key];
      if (key === 'photos' && value instanceof FileList) {
        for (let i = 0; i < value.length; i++) {
          dataToSend.append('photos[]', value[i]);
        }
      } else if (typeof value === 'boolean') {
        dataToSend.append(key, value ? '1' : '0');
      } else if (value !== null && value !== undefined) {
        dataToSend.append(key, value);
      }
    });

    mutation.mutate(profileId ? { id: profileId, data: dataToSend } : dataToSend);
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
