import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteHelperProfilesHelperProfilePhotosPhoto,
  getGetHelperProfilesIdQueryKey,
  getHelperProfilesId,
} from "@/api/generated/helper-profiles/helper-profiles";
import { api } from "@/api/axios";
import { useParams, useNavigate } from "react-router-dom";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import type { HelperProfile } from "@/types/helper-profile";
import { HelperProfileViewHeader } from "@/components/helper/profile-view/HelperProfileViewHeader";
import { HelperProfileSummaryHeader } from "@/components/helper/profile-view/HelperProfileSummaryHeader";
import { HelperProfilePhotoGalleryCard } from "@/components/helper/profile-view/HelperProfilePhotoGalleryCard";
import { HelperProfilePlacementRequestsCard } from "@/components/helper/profile-view/HelperProfilePlacementRequestsCard";
import { HelperProfileRequestTypesCard } from "@/components/helper/profile-view/HelperProfileRequestTypesCard";
import { HelperProfilePetTypesCard } from "@/components/helper/profile-view/HelperProfilePetTypesCard";
import { HelperProfileDetailsCard } from "@/components/helper/profile-view/HelperProfileDetailsCard";
import { HelperProfileExperienceCard } from "@/components/helper/profile-view/HelperProfileExperienceCard";
import { HelperProfileContactInfoCard } from "@/components/helper/profile-view/HelperProfileContactInfoCard";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/i18n-toast";

export default function HelperProfileViewPage() {
  const { t } = useTranslation("helper");
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const numericId = id ? Number(id) : undefined;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: numericId ? getGetHelperProfilesIdQueryKey(numericId) : ["helper-profile", id],
    queryFn: () =>
      numericId ? getHelperProfilesId(numericId) : Promise.reject(new Error("missing id")),
    enabled: numericId != null,
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: number) =>
      numericId
        ? deleteHelperProfilesHelperProfilePhotosPhoto(numericId, photoId)
        : Promise.reject(new Error("missing id")),
    onSuccess: () => {
      toast.success("settings:helperProfiles.photoDeleted");
      if (numericId) {
        void queryClient.invalidateQueries({
          queryKey: getGetHelperProfilesIdQueryKey(numericId),
        });
      }
    },
    onError: () => {
      toast.error("settings:helperProfiles.photoDeleteError");
    },
  });

  const setPrimaryPhotoMutation = useMutation({
    mutationFn: (photoId: number) =>
      numericId
        ? api.post(`/helper-profiles/${String(numericId)}/photos/${String(photoId)}/set-primary`)
        : Promise.reject(new Error("missing id")),
    onSuccess: (updatedProfile) => {
      toast.success("helper:photos.setPrimarySuccess");
      if (numericId) {
        queryClient.setQueryData<HelperProfile>(
          getGetHelperProfilesIdQueryKey(numericId),
          (current) =>
            current
              ? ({
                  ...current,
                  photos: (updatedProfile as HelperProfile).photos ?? current.photos,
                } as HelperProfile)
              : (updatedProfile as HelperProfile),
        );
        void queryClient.invalidateQueries({
          queryKey: getGetHelperProfilesIdQueryKey(numericId),
        });
      }
    },
    onError: () => {
      toast.error("helper:photos.setPrimaryError");
    },
  });

  const handleEdit = () => {
    void navigate(`/helper/${id ?? ""}/edit`);
  };

  if (isLoading) {
    return <LoadingState message={t("view.loading")} />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        error={t("view.loadError")}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const profile = data as unknown as HelperProfile;
  const photos = profile.photos ?? [];
  const petTypes: NonNullable<HelperProfile["pet_types"]> = profile.pet_types ?? [];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <HelperProfileViewHeader helperName={profile.user?.name} onEdit={handleEdit} />

      {/* Main Content */}
      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          <HelperProfileSummaryHeader profile={profile} />

          <HelperProfilePhotoGalleryCard
            photos={photos}
            canManage
            deletingPhotoId={deletePhotoMutation.variables ?? null}
            settingPrimaryPhotoId={setPrimaryPhotoMutation.variables ?? null}
            onDeletePhoto={async (photo) => {
              await deletePhotoMutation.mutateAsync(photo.id);
            }}
            onSetPrimaryPhoto={async (photo) => {
              await setPrimaryPhotoMutation.mutateAsync(photo.id);
            }}
          />

          <HelperProfilePlacementRequestsCard profile={profile} />

          <HelperProfileRequestTypesCard profile={profile} />

          <HelperProfilePetTypesCard petTypes={petTypes} />

          <HelperProfileDetailsCard profile={profile} />

          <HelperProfileExperienceCard experience={profile.experience} />

          <HelperProfileContactInfoCard contactDetails={profile.contact_details} />
        </div>
      </main>
    </div>
  );
}
