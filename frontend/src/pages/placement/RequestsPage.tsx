import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { PetCard } from "@/components/pets/PetCard";
import {
  SlidersHorizontal,
  ArrowDownNarrowWide,
  ArrowDownWideNarrow,
  RotateCcw,
  ListChevronsUpDown,
  ListChevronsDownUp,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DatePicker } from "@/components/ui/date-picker";
import { DiscoverPageSwitch } from "@/components/navigation/DiscoverPageSwitch";
import { getPetsPlacementRequests as getPlacementRequests } from "@/api/generated/pets/pets";
import { getPetTypes } from "@/api/generated/pet-types/pet-types";
import type { Pet, PetType } from "@/types/pet";
import { getCountryName } from "@/components/ui/CountrySelect";
import { LoadingState } from "@/components/ui/LoadingState";
import { FilterChip, ToggleButton } from "@/components/ui/filter-controls";
import { setStoredDiscoverPage } from "@/lib/discover-page";
import { cn } from "@/lib/utils";
import { consumeListScrollPosition } from "@/lib/scroll-restoration";

type PlacementRequestType = "all" | "foster_paid" | "foster_free" | "permanent" | "pet_sitting";
type SortDirection = "newest" | "oldest";
type DateComparison = "before" | "on" | "after";

const REQUEST_TYPE_OPTIONS: Exclude<PlacementRequestType, "all">[] = [
  "foster_paid",
  "foster_free",
  "permanent",
  "pet_sitting",
];
const DATE_COMPARISON_OPTIONS: DateComparison[] = ["before", "on", "after"];

const RequestsPage = () => {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const [pets, setPets] = useState<Pet[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestTypeFilter, setRequestTypeFilter] = useState<PlacementRequestType>("all");
  const [petTypeFilter, setPetTypeFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);
  const [pickupDateComparison, setPickupDateComparison] = useState<DateComparison>("on");
  const [dropoffDate, setDropoffDate] = useState<Date | undefined>(undefined);
  const [dropoffDateComparison, setDropoffDateComparison] = useState<DateComparison>("on");
  const [createdSortDirection, setCreatedSortDirection] = useState<SortDirection>("newest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [petTypesExpanded, setPetTypesExpanded] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    setStoredDiscoverPage("requests");
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [petsResponse, petTypesResponse] = await Promise.all([
          getPlacementRequests(),
          getPetTypes(),
        ]);
        setPets(petsResponse as unknown as Pet[]);
        setPetTypes(
          petTypesResponse.map((item) => ({
            id: item.id ?? 0,
            name: item.name ?? "",
            slug: item.slug ?? "",
            description: item.description,
            is_active: true,
            is_system: false,
            display_order: 0,
            placement_requests_allowed: false,
          })),
        );
        setError(null);
      } catch (err: unknown) {
        setError(t("requests.loadError"));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchInitialData();
  }, [t, locale]);

  useEffect(() => {
    const sortParam = searchParams.get("sort");
    if (sortParam === "newest" || sortParam === "oldest") {
      if (sortParam !== createdSortDirection) {
        setCreatedSortDirection(sortParam);
      }
      return;
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("sort", "newest");
        return next;
      },
      { replace: true },
    );
  }, [createdSortDirection, searchParams, setSearchParams]);

  useEffect(() => {
    if (loading) return;
    const savedY = consumeListScrollPosition("/requests");
    if (savedY === null) return;
    requestAnimationFrame(() => {
      window.scrollTo(0, savedY);
    });
  }, [loading]);

  const availableCountries = useMemo(() => {
    const countryCodes = new Set<string>();
    pets.forEach((pet) => {
      if (pet.country) countryCodes.add(pet.country);
    });
    return Array.from(countryCodes).sort((a, b) =>
      getCountryName(a).localeCompare(getCountryName(b)),
    );
  }, [pets]);

  const filteredPets = useMemo(() => {
    if (pets.length === 0) return [] as Pet[];
    const visibleStatuses = ["open", "fulfilled", "pending_transfer", "active", "finalized"];

    const filtered = pets.filter((pet) => {
      const prs = pet.placement_requests;
      if (!prs || prs.length === 0) return false;
      if (!prs.some((pr) => visibleStatuses.includes(pr.status.toLowerCase()))) return false;
      if (petTypeFilter !== "all" && pet.pet_type?.slug !== petTypeFilter) return false;
      if (countryFilter !== "all" && pet.country !== countryFilter) return false;
      if (
        requestTypeFilter !== "all" &&
        !prs.some((pr) => pr.request_type.toLowerCase() === requestTypeFilter)
      )
        return false;

      const compareDates = (
        prDate: number | undefined,
        filterDate: number,
        comparison: DateComparison,
      ): boolean => {
        if (prDate === undefined) return false;
        switch (comparison) {
          case "before":
            return prDate < filterDate;
          case "on":
            return new Date(prDate).toDateString() === new Date(filterDate).toDateString();
          case "after":
            return prDate > filterDate;
        }
      };

      if (pickupDate) {
        const filterTime = pickupDate.getTime();
        const matchesPickup = prs.some((pr) => {
          const prStart = pr.start_date ? new Date(pr.start_date).getTime() : undefined;
          return compareDates(prStart, filterTime, pickupDateComparison);
        });
        if (!matchesPickup) return false;
      }

      if (dropoffDate && requestTypeFilter !== "permanent") {
        const filterTime = dropoffDate.getTime();
        const matchesDropoff = prs.some((pr) => {
          const prEnd = pr.end_date ? new Date(pr.end_date).getTime() : undefined;
          return compareDates(prEnd, filterTime, dropoffDateComparison);
        });
        if (!matchesDropoff) return false;
      }

      return true;
    });

    const getLatestCreatedAt = (pet: Pet): number => {
      const timestamps =
        pet.placement_requests
          ?.map((pr) => (pr.created_at ? new Date(pr.created_at).getTime() : NaN))
          .filter((ts) => !Number.isNaN(ts)) ?? [];
      return timestamps.length === 0 ? 0 : Math.max(...timestamps);
    };

    return filtered
      .map((pet) => ({ pet, latestCreatedAt: getLatestCreatedAt(pet) }))
      .sort((a, b) => {
        const diff = b.latestCreatedAt - a.latestCreatedAt;
        return createdSortDirection === "newest" ? diff : -diff;
      })
      .map(({ pet }) => pet);
  }, [
    pets,
    requestTypeFilter,
    petTypeFilter,
    countryFilter,
    pickupDate,
    pickupDateComparison,
    dropoffDate,
    dropoffDateComparison,
    createdSortDirection,
  ]);
  // NOTE: If you add a new filter state variable, remember to add it to the
  // dependency array above. Consider consolidating into a single filter object
  // (like MyPetsPage's usePetFilter) to avoid this fragility.

  const hasActiveFilters =
    requestTypeFilter !== "all" ||
    petTypeFilter !== "all" ||
    countryFilter !== "all" ||
    pickupDate !== undefined ||
    dropoffDate !== undefined ||
    createdSortDirection !== "newest";

  const resetFilters = () => {
    setRequestTypeFilter("all");
    setPetTypeFilter("all");
    setCountryFilter("all");
    setPickupDate(undefined);
    setDropoffDate(undefined);
    setCreatedSortDirection("newest");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("sort", "newest");
        return next;
      },
      { replace: true },
    );
  };

  const setSortDirection = (dir: SortDirection) => {
    setCreatedSortDirection(dir);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("sort", dir);
      return next;
    });
  };

  const toggleRequestType = (type: Exclude<PlacementRequestType, "all">) => {
    setRequestTypeFilter((prev) => (prev === type ? "all" : type));
  };

  const togglePetType = (slug: string) => {
    setPetTypeFilter((prev) => (prev === slug ? "all" : slug));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{t("requests.title")}</h1>
        <DiscoverPageSwitch
          target="helpers"
          label={t("nav.helpers")}
          onSelect={setStoredDiscoverPage}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  setFilterOpen((v) => !v);
                }}
                className={cn(
                  "relative rounded-md p-1.5 transition-all duration-200 hover:bg-muted",
                  filterOpen || hasActiveFilters
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground",
                )}
                aria-label={t("requests.filters.toggle")}
                aria-expanded={filterOpen}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {hasActiveFilters && !filterOpen && (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t("requests.filters.toggle")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="mb-8 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="rounded-xl border bg-card/60 shadow-sm backdrop-blur-sm overflow-hidden">
            {/* Row 1 — Request type chips */}
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {t("requests.filters.requestType")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {REQUEST_TYPE_OPTIONS.map((type) => (
                  <FilterChip
                    key={type}
                    label={t(`requests.requestTypes.${type}`)}
                    active={requestTypeFilter === type}
                    onClick={() => {
                      toggleRequestType(type);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Row 2 — Pet type, Country, Sort, Reset */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:divide-x sm:divide-border">
              {/* Pet type chips — only when multiple types exist */}
              {petTypes.length > 1 && (
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {t("requests.filters.petType")}
                  </span>
                  {petTypes.length > 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPetTypesExpanded((v) => !v);
                      }}
                      className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={petTypesExpanded ? t("actions.showLess") : t("actions.showMore")}
                    >
                      {petTypesExpanded ? (
                        <ListChevronsDownUp className="h-3.5 w-3.5" />
                      ) : (
                        <ListChevronsUpDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {(petTypesExpanded ? petTypes : petTypes.slice(0, 3)).map((pt) => (
                      <FilterChip
                        key={pt.id}
                        label={pt.name}
                        active={petTypeFilter === pt.slug}
                        onClick={() => {
                          togglePetType(pt.slug);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Country select + sort direction */}
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-1">
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger
                    className="h-7 w-44 border-0 bg-muted/60 text-sm shadow-none focus:ring-0"
                    aria-label="Country Filter"
                  >
                    <SelectValue placeholder={t("requests.filters.allCountries")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("requests.filters.allCountries")}</SelectItem>
                    {availableCountries.map((code) => (
                      <SelectItem key={code} value={code}>
                        {getCountryName(code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Segmented sort direction */}
                <div className="flex overflow-hidden rounded-md border bg-muted/40">
                  <ToggleButton
                    icon={<ArrowDownNarrowWide className="h-3.5 w-3.5" />}
                    label={t("requests.sort.newest")}
                    active={createdSortDirection === "newest"}
                    onClick={() => {
                      setSortDirection("newest");
                    }}
                  />
                  <div className="w-px bg-border" />
                  <ToggleButton
                    icon={<ArrowDownWideNarrow className="h-3.5 w-3.5" />}
                    label={t("requests.sort.oldest")}
                    active={createdSortDirection === "oldest"}
                    onClick={() => {
                      setSortDirection("oldest");
                    }}
                  />
                </div>
              </div>

              {/* Reset */}
              {hasActiveFilters && (
                <div className="px-3 py-3 sm:self-stretch flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>{t("requests.filters.reset")}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>{t("requests.filters.reset")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>

            {/* Row 3 — Date filters */}
            <div className="border-t px-4 py-3">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:max-w-3xl">
                <DateFilterRow
                  label={t("requests.filters.pickup")}
                  comparisonAriaLabel="Pickup Date Comparison"
                  date={pickupDate}
                  setDate={setPickupDate}
                  comparison={pickupDateComparison}
                  setComparison={setPickupDateComparison}
                  comparisonOptions={DATE_COMPARISON_OPTIONS}
                  comparisonLabel={(op) => t(`requests.dateComparison.${op}`)}
                />
                {requestTypeFilter !== "permanent" && (
                  <DateFilterRow
                    label={t("requests.filters.dropoff")}
                    comparisonAriaLabel="Drop-off Date Comparison"
                    date={dropoffDate}
                    setDate={setDropoffDate}
                    comparison={dropoffDateComparison}
                    setComparison={setDropoffDateComparison}
                    comparisonOptions={DATE_COMPARISON_OPTIONS}
                    comparisonLabel={(op) => t(`requests.dateComparison.${op}`)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading && <LoadingState message={t("requests.loading")} />}
      {error && <p className="text-center text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPets.map((pet) => (
            <PetCard key={pet.id} pet={pet} />
          ))}
          {filteredPets.length === 0 && (
            <p className="col-span-full py-8 text-center text-muted-foreground">
              {t("requests.noResults")}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function DateFilterRow({
  label,
  comparisonAriaLabel,
  date,
  setDate,
  comparison,
  setComparison,
  comparisonOptions,
  comparisonLabel,
}: {
  label: string;
  comparisonAriaLabel: string;
  date: Date | undefined;
  setDate: (d: Date | undefined) => void;
  comparison: DateComparison;
  setComparison: (c: DateComparison) => void;
  comparisonOptions: DateComparison[];
  comparisonLabel: (op: DateComparison) => string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="min-w-13 shrink-0 text-sm text-muted-foreground">{label}</span>
        <Select
          value={comparison}
          onValueChange={(v) => {
            setComparison(v as DateComparison);
          }}
        >
          <SelectTrigger className="w-22.5" aria-label={comparisonAriaLabel}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {comparisonOptions.map((op) => (
              <SelectItem key={op} value={op}>
                {comparisonLabel(op)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DatePicker date={date} setDate={setDate} className="w-full" />
    </div>
  );
}

export default RequestsPage;
