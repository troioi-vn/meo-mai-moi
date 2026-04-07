import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FileInput } from "@/components/ui/FileInput";
import useHelperProfileForm from "@/hooks/useHelperProfileForm";
import { useGetPetTypes } from "@/api/generated/pet-types/pet-types";
import type { PetType, City } from "@/types/pet";
import type { HelperProfile } from "@/types/helper-profile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getHelperProfilesId as getHelperProfile,
  deleteHelperProfilesId as deleteHelperProfile,
  deleteHelperProfilesHelperProfilePhotosPhoto as deleteHelperProfilePhoto,
  getGetHelperProfilesIdQueryKey,
  getGetHelperProfilesQueryKey,
  postHelperProfilesIdArchive as archiveHelperProfile,
  postHelperProfilesIdRestore as restoreHelperProfile,
} from "@/api/generated/helper-profiles/helper-profiles";
import { toast } from "@/lib/i18n-toast";
import { HelperProfileFormFields } from "@/components/helper/HelperProfileFormFields";
import { PetTypesSelector } from "@/components/helper/PetTypesSelector";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Heart, Camera } from "lucide-react";
import { HelperProfileEditBreadcrumb } from "@/components/helper/profile-edit/HelperProfileEditBreadcrumb";
import { HelperProfileEditHero } from "@/components/helper/profile-edit/HelperProfileEditHero";
import { FormSectionHeader } from "@/components/helper/profile-edit/FormSectionHeader";
import { CurrentPhotosCard } from "@/components/helper/profile-edit/CurrentPhotosCard";
import { ProfileStatusSection } from "@/components/helper/profile-edit/ProfileStatusSection";
import { EditFormActions } from "@/components/helper/profile-edit/EditFormActions";
import { useTranslation } from "react-i18next";

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const HelperProfileEditPage: React.FC = () => {
  const { t, i18n } = useTranslation(["helper", "common"]);
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const { id } = useParams();
  const numericId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: numericId ? getGetHelperProfilesIdQueryKey(numericId) : ["helper-profile", id],
    queryFn: () =>
      numericId ? getHelperProfile(numericId) : Promise.reject(new Error("missing id")),
    enabled: numericId != null,
  });

  const { data: petTypes } = useGetPetTypes<PetType[]>({
    query: {
      queryKey: ["pet-types", locale],
      select: (items) =>
        items.map((item) => ({
          id: item.id ?? 0,
          name: item.name ?? "",
          slug: item.slug ?? "",
          description: item.description,
          is_active: true,
          is_system: false,
          display_order: 0,
          placement_requests_allowed: false,
        })),
    },
  });

  // Prepare initial form data from loaded data
  const initialFormData = useMemo(() => {
    if (!data) return {};

    // Cast to local HelperProfile type which has all needed fields
    const profile = data as unknown as HelperProfile;
    const citiesSelected = profile.cities ?? [];

    // Fallback for old data if cities is empty but city_id exists
    if (citiesSelected.length === 0 && profile.city_id) {
      const cityValue =
        typeof profile.city === "string"
          ? {
              id: profile.city_id,
              name: profile.city,
              slug: profile.city.toLowerCase().replace(/\s+/g, "-"),
              country: profile.country ?? "",
              description: null,
              created_by: null,
              approved_at: null,
              created_at: "",
              updated_at: "",
            }
          : (profile.city as unknown as City);
      citiesSelected.push(cityValue);
    }

    return {
      country: profile.country ?? "",
      address: profile.address ?? "",
      city: citiesSelected.map((c) => c.name).join(", "),
      city_ids: citiesSelected.map((c) => c.id),
      cities_selected: citiesSelected,
      state: profile.state ?? "",
      phone_number: profile.phone_number ?? profile.phone ?? "",
      contact_details: profile.contact_details ?? [],
      experience: profile.experience ?? "",
      has_pets: Boolean(profile.has_pets),
      has_children: Boolean(profile.has_children),
      request_types: profile.request_types ?? [],
      status: profile.status,
      photos: [],
      pet_type_ids: profile.pet_types?.map((pt) => pt.id) ?? [],
    };
  }, [data]);

  // Initialize the form hook with proper initial data
  const { formData, errors, isSubmitting, updateField, updateCities, handleSubmit, handleCancel } =
    useHelperProfileForm(numericId, initialFormData);

  const deleteMutation = useMutation({
    mutationFn: () =>
      numericId ? deleteHelperProfile(numericId) : Promise.reject(new Error("missing id")),
    onSuccess: () => {
      toast.success("settings:helperProfiles.deleted");
      void queryClient.invalidateQueries({ queryKey: getGetHelperProfilesQueryKey() });
      void navigate("/helper");
    },
    onError: (error: unknown) => {
      const message =
        (error as ApiError).response?.data?.message ?? "settings:helperProfiles.deleteError";
      if (message.startsWith("settings:")) {
        toast.error(message);
      } else {
        toast.raw.error(message);
      }
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      numericId ? archiveHelperProfile(numericId) : Promise.reject(new Error("missing id")),
    onSuccess: () => {
      toast.success("settings:helperProfiles.archived");
      void queryClient.invalidateQueries({ queryKey: getGetHelperProfilesQueryKey() });
      if (numericId) {
        void queryClient.invalidateQueries({ queryKey: getGetHelperProfilesIdQueryKey(numericId) });
      }
      void navigate("/helper");
    },
    onError: (error: unknown) => {
      const message =
        (error as ApiError).response?.data?.message ?? "settings:helperProfiles.archiveError";
      if (message.startsWith("settings:")) {
        toast.error(message);
      } else {
        toast.raw.error(message);
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () =>
      numericId ? restoreHelperProfile(numericId) : Promise.reject(new Error("missing id")),
    onSuccess: () => {
      toast.success("settings:helperProfiles.restored");
      void queryClient.invalidateQueries({ queryKey: getGetHelperProfilesQueryKey() });
      if (numericId) {
        void queryClient.invalidateQueries({ queryKey: getGetHelperProfilesIdQueryKey(numericId) });
      }
    },
    onError: (error: unknown) => {
      const message =
        (error as ApiError).response?.data?.message ?? "settings:helperProfiles.restoreError";
      if (message.startsWith("settings:")) {
        toast.error(message);
      } else {
        toast.raw.error(message);
      }
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: number) =>
      numericId
        ? deleteHelperProfilePhoto(numericId, photoId)
        : Promise.reject(new Error("missing id")),
    onSuccess: () => {
      if (numericId) {
        void queryClient.invalidateQueries({ queryKey: getGetHelperProfilesIdQueryKey(numericId) });
      }
      toast.success("settings:helperProfiles.photoDeleted");
    },
    onError: (error) => {
      console.error("Delete photo error:", error);
      toast.error("settings:helperProfiles.photoDeleteError");
    },
  });

  if (isLoading) {
    return <LoadingState message={t("helper:edit.loading")} />;
  }

  if (isError) {
    return (
      <ErrorState
        error={t("helper:edit.loadError")}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!data) {
    return (
      <ErrorState
        error={t("helper:edit.notFound")}
        onRetry={() => {
          void navigate("/helper");
        }}
      />
    );
  }

  // Cast to local HelperProfile type which has all needed fields
  const profile = data as unknown as HelperProfile;

  const helperName = profile.user?.name ?? t("helper:view.helperFallback");

  const photos: { id: number; path: string }[] = (profile.photos ?? [])
    .filter(
      (photo): photo is { id: number; path: string } =>
        typeof photo.id === "number" && typeof photo.path === "string",
    )
    .map((photo) => ({
      id: photo.id,
      path: photo.path,
    }));

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <HelperProfileEditBreadcrumb helperName={helperName} />

      <main className="px-4 pb-12">
        <div className="max-w-3xl mx-auto">
          <HelperProfileEditHero />

          <div className="space-y-8">
            <CurrentPhotosCard
              photos={photos}
              onDelete={(photoId) => {
                deletePhotoMutation.mutate(photoId);
              }}
              deleting={deletePhotoMutation.isPending}
            />

            {/* Edit Form */}
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-10" noValidate>
                  <HelperProfileFormFields
                    formData={formData}
                    errors={errors}
                    updateField={updateField}
                    citiesValue={formData.cities_selected}
                    onCitiesChange={updateCities}
                  />

                  <section>
                    <FormSectionHeader
                      icon={Heart}
                      title={t("helper:form.petPreferencesSection")}
                    />
                    <PetTypesSelector
                      petTypes={petTypes ?? []}
                      selectedPetTypeIds={formData.pet_type_ids}
                      onChangePetTypeIds={(ids) => {
                        updateField("pet_type_ids")(ids);
                      }}
                      label={t("helper:form.petTypesLabel")}
                      error={errors.pet_type_ids}
                    />
                  </section>

                  <section>
                    <FormSectionHeader icon={Camera} title={t("helper:edit.addPhotosTitle")} />
                    <div className="bg-muted/30 rounded-lg p-4 border-2 border-dashed border-muted-foreground/20">
                      <FileInput
                        id="photos"
                        label={t("helper:form.uploadPhotos")}
                        onChange={updateField("photos")}
                        error={errors.photos}
                        multiple
                        accept="image/*"
                      />
                    </div>
                  </section>

                  <ProfileStatusSection
                    status={profile.status}
                    hasPlacementResponses={Boolean(
                      profile.placement_responses && profile.placement_responses.length > 0,
                    )}
                    onArchive={() => {
                      archiveMutation.mutate();
                    }}
                    onRestore={() => {
                      restoreMutation.mutate();
                    }}
                    onDelete={() => {
                      deleteMutation.mutate();
                    }}
                    isArchiving={archiveMutation.isPending}
                    isRestoring={restoreMutation.isPending}
                    isDeleting={deleteMutation.isPending}
                  />

                  <EditFormActions
                    isSubmitting={isSubmitting}
                    onCancel={() => {
                      handleCancel();
                    }}
                  />
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HelperProfileEditPage;
