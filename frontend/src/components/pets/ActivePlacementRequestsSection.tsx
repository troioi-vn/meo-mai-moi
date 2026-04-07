import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PetCard } from "@/components/pets/PetCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPetsPlacementRequests } from "@/api/generated/pets/pets";
import type { Pet } from "@/types/pet";
import { useTranslation } from "react-i18next";

interface ActivePlacementRequestsSectionProps {
  className?: string;
}

export const ActivePlacementRequestsSection: React.FC<ActivePlacementRequestsSectionProps> = ({
  className = "",
}) => {
  const { t } = useTranslation(["pets", "common"]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMoreVisible, setShowMoreVisible] = useState(false);
  const navigate = useNavigate();

  const fetchPlacementRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = (await getPetsPlacementRequests()) as unknown as Pet[];

      // Client-side limiting keeps the section compact while preserving a clear "view all" path.
      setPets(response.slice(0, 4));
      setShowMoreVisible(response.length > 4);
    } catch (err: unknown) {
      setError(t("pets:activePlacementRequests.loadError"));
      console.error("Error fetching placement requests:", err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchPlacementRequests();
  }, [fetchPlacementRequests]);

  const handleShowMore = () => {
    void navigate("/requests");
  };

  const handleRetry = useCallback(async () => {
    await fetchPlacementRequests();
  }, [fetchPlacementRequests]);

  // Loading state - using skeleton cards to match the expected layout
  if (loading) {
    return (
      <section className={`container mx-auto px-4 py-8 ${className}`}>
        <h2 className="mb-8 text-3xl font-bold text-center">
          {t("pets:activePlacementRequests.title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Loading skeleton cards */}
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`skeleton-${String(index)}`}
              className="rounded-lg border bg-card text-card-foreground shadow-sm"
            >
              <Skeleton className="h-48 w-full rounded-t-lg" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Error state with user-friendly message and retry functionality
  if (error) {
    return (
      <section className={`container mx-auto px-4 py-8 ${className}`}>
        <h2 className="mb-8 text-3xl font-bold text-center">
          {t("pets:activePlacementRequests.title")}
        </h2>
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg">{error}</p>
          <p className="text-muted-foreground">
            We&apos;re having trouble loading the placement requests. Please check your connection
            and try again.
          </p>
          <Button
            onClick={() => {
              void handleRetry();
            }}
            variant="outline"
            size="lg"
          >
            Try Again
          </Button>
        </div>
      </section>
    );
  }

  // Main content
  return (
    <section className={`container mx-auto px-4 py-8 ${className}`}>
      <h2 className="mb-8 text-3xl font-bold text-center">
        {t("pets:activePlacementRequests.title")}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {pets.length === 0 ? (
          <div className="col-span-full text-center py-12 space-y-4">
            <div className="text-6xl">🐾</div>
            <h3 className="text-xl font-semibold">{t("pets:placementRequests.none")}</h3>
            <p className="text-muted-foreground">
              {t("pets:activePlacementRequests.emptyMessage")}
            </p>
          </div>
        ) : (
          pets.map((pet) => <PetCard key={pet.id} pet={pet} />)
        )}
      </div>

      {showMoreVisible && (
        <div className="mt-8 text-center">
          <Button
            onClick={handleShowMore}
            variant="default"
            size="lg"
            className="transition-all duration-200 hover:scale-105 focus:scale-105"
          >
            {t("common:actions.view_all")} {t("common:nav.requests")}
          </Button>
        </div>
      )}
    </section>
  );
};
