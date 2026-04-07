import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPublicHelperProfile } from "@/api/public-helpers";
import type { HelperProfile } from "@/types/helper-profile";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { HelperProfileSummaryHeader } from "@/components/helper/profile-view/HelperProfileSummaryHeader";
import { HelperProfilePhotoGalleryCard } from "@/components/helper/profile-view/HelperProfilePhotoGalleryCard";
import { HelperProfileRequestTypesCard } from "@/components/helper/profile-view/HelperProfileRequestTypesCard";
import { HelperProfilePetTypesCard } from "@/components/helper/profile-view/HelperProfilePetTypesCard";
import { HelperProfileDetailsCard } from "@/components/helper/profile-view/HelperProfileDetailsCard";
import { HelperProfileExperienceCard } from "@/components/helper/profile-view/HelperProfileExperienceCard";
import { HelperProfileContactInfoCard } from "@/components/helper/profile-view/HelperProfileContactInfoCard";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Photo {
  id: number;
  path: string;
  url?: string;
}

export default function PublicHelperProfileViewPage() {
  const { t } = useTranslation(["helper", "common"]);
  const { id } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-helper-profile", id],
    queryFn: () => getPublicHelperProfile(Number(id)),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <LoadingState message={t("helper:public.loadingProfile")} />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        error={t("helper:public.loadProfileError")}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const profile = data;
  const photos = (profile.photos as Photo[] | undefined) ?? [];
  const petTypes: NonNullable<HelperProfile["pet_types"]> = profile.pet_types ?? [];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">{t("common:nav.home")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/helpers">{t("helper:public.title")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {profile.user?.name ?? t("helper:public.helperFallback")}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <main className="px-4 pb-8">
        <div className="mx-auto max-w-lg space-y-6">
          <HelperProfileSummaryHeader profile={profile} />
          <HelperProfilePhotoGalleryCard photos={photos} />
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
