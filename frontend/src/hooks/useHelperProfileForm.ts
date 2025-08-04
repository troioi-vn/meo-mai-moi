import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createHelperProfile, updateHelperProfile } from '@/api/helper-profiles';
import { toast } from 'sonner';

const useHelperProfileForm = (profileId, initialData) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const mutation = useMutation({
    mutationFn: profileId ? updateHelperProfile : createHelperProfile,
    onSuccess: () => {
      queryClient.invalidateQueries(['helper-profiles']);
      toast.success(profileId ? 'Helper profile updated successfully!' : 'Helper profile created successfully!');
      navigate('/helper');
    },
    onError: (error) => {
      setErrors(error.response.data.errors);
      toast.error(profileId ? 'Failed to update helper profile. Please try again.' : 'Failed to create helper profile. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const updateField = (field) => (value) => {
    setFormData({ ...formData, [field]: value });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.location) newErrors.location = 'Location is required';
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
    const data = new FormData();
    for (const key in formData) {
        if (key === 'photos') {
            for (let i = 0; i < formData.photos.length; i++) {
                data.append('photos[]', formData.photos[i]);
            }
        } else {
            data.append(key, formData[key]);
        }
    }
    if (profileId) {
      mutation.mutate({ id: profileId, data });
    } else {
      mutation.mutate(data);
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