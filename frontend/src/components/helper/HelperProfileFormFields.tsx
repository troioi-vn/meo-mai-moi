import React from "react";
import { FormField } from "@/components/ui/FormField";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { Button } from "@/components/ui/button";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { MapPin, Phone, Briefcase, ClipboardList, CircleHelp, Plus, Trash2 } from "lucide-react";
import {
  type HelperContactDetail,
  type HelperProfileStatus,
  type PlacementRequestType,
} from "@/types/helper-profile";
import { CitySelect } from "@/components/location/CitySelect";
import type { City } from "@/types/pet";
import { useTranslation } from "react-i18next";
import { getCountries } from "@/api/countries";
import type { CountryOption } from "@/api/countries";
import {
  createDefaultContactDetail,
  getContactDetailDisplayText,
  getContactDetailHref,
  getContactDetailOptions,
  isUniqueContactDetailType,
  normalizeContactDetailValue,
} from "@/lib/helper-contact-details";

const FormSectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 pb-2 border-b mb-4">
    <Icon className="h-5 w-5 text-primary" />
    <h3 className="text-lg font-semibold">{title}</h3>
  </div>
);

interface Props {
  formData: {
    country: string;
    address: string;
    city_ids?: number[];
    city: string;
    state: string;
    phone_number: string;
    contact_details: HelperContactDetail[];
    experience: string;
    offer: string;
    has_pets: boolean;
    has_children: boolean;
    request_types: PlacementRequestType[];
    status?: HelperProfileStatus;
  };
  errors: Record<string, string>;
  updateField: (field: keyof Props["formData"]) => (value: unknown) => void;
  citiesValue?: City[];
  onCitiesChange?: (cities: City[]) => void;
}

export const HelperProfileFormFields: React.FC<Props> = ({
  formData,
  errors,
  updateField,
  citiesValue = [],
  onCitiesChange,
}) => {
  const { t } = useTranslation(["helper", "pets", "common"]);
  const [countriesFromApi, setCountriesFromApi] = React.useState<CountryOption[]>([]);
  const [phonePrefix, setPhonePrefix] = React.useState("");
  const [phoneDigits, setPhoneDigits] = React.useState("");

  const countryPrefixMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const country of countriesFromApi) {
      if (country.phone_prefix) {
        map.set(country.code, country.phone_prefix);
      }
    }
    return map;
  }, [countriesFromApi]);

  const phonePrefixOptions = React.useMemo(() => {
    const unique = Array.from(
      new Set(
        countriesFromApi
          .map((country) => country.phone_prefix)
          .filter((prefix): prefix is string => typeof prefix === "string" && prefix.length > 0),
      ),
    );

    return unique.sort((a, b) => {
      const numA = Number.parseInt(a.replace("+", ""), 10);
      const numB = Number.parseInt(b.replace("+", ""), 10);
      if (Number.isNaN(numA) || Number.isNaN(numB)) {
        return a.localeCompare(b);
      }
      return numA - numB;
    });
  }, [countriesFromApi]);

  const parsePhoneNumber = React.useCallback(
    (rawPhone: string) => {
      const normalized = rawPhone.trim().replace(/[\s()-]/g, "");
      const normalizedPrefixes = [...phonePrefixOptions].sort((a, b) => b.length - a.length);

      if (normalized.startsWith("+")) {
        const matchedPrefix = normalizedPrefixes.find((prefix) => normalized.startsWith(prefix));
        if (matchedPrefix) {
          return {
            prefix: matchedPrefix,
            digits: normalized.slice(matchedPrefix.length).replace(/\D/g, ""),
          };
        }
      }

      return {
        prefix: "",
        digits: normalized.replace(/\D/g, ""),
      };
    },
    [phonePrefixOptions],
  );

  React.useEffect(() => {
    let active = true;

    const loadCountries = async () => {
      try {
        const result = await getCountries();
        if (active) {
          setCountriesFromApi(result);
        }
      } catch {
        if (active) {
          setCountriesFromApi([]);
        }
      }
    };

    void loadCountries();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    const parsed = parsePhoneNumber(formData.phone_number);
    setPhonePrefix(parsed.prefix);
    setPhoneDigits(parsed.digits);
  }, [formData.phone_number, parsePhoneNumber]);

  const syncPhoneNumber = React.useCallback(
    (nextPrefix: string, nextDigits: string) => {
      const combined = `${nextPrefix}${nextDigits}`;
      updateField("phone_number")(combined);
    },
    [updateField],
  );

  const requestTypeOptions: { value: PlacementRequestType; label: string }[] = [
    { value: "foster_paid", label: t("helper:form.types.foster_paid") },
    { value: "foster_free", label: t("helper:form.types.foster_free") },
    { value: "permanent", label: t("helper:form.types.permanent") },
    { value: "pet_sitting", label: t("helper:form.types.pet_sitting") },
  ];
  const contactDetailOptions = getContactDetailOptions(t);
  const shouldShowOfferField =
    formData.request_types.includes("foster_paid") ||
    formData.request_types.includes("pet_sitting");

  const updateContactDetails = React.useCallback(
    (nextContactDetails: HelperContactDetail[]) => {
      updateField("contact_details")(nextContactDetails);
    },
    [updateField],
  );

  const usedUniqueTypes = new Set(
    formData.contact_details
      .filter((contactDetail) => isUniqueContactDetailType(contactDetail.type))
      .map((contactDetail) => contactDetail.type),
  );

  return (
    <div className="space-y-8">
      <section>
        <FormSectionHeader icon={CircleHelp} title={t("helper:form.visibilitySection")} />
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="helper-profile-public">{t("helper:form.publicToggle")}</Label>
              <p className="text-sm text-muted-foreground">{t("helper:form.publicToggleHelp")}</p>
            </div>
            <Switch
              id="helper-profile-public"
              checked={formData.status === "public"}
              onCheckedChange={(checked) => {
                updateField("status")(checked ? "public" : "private");
              }}
            />
          </div>
        </div>
      </section>

      <section>
        <FormSectionHeader icon={MapPin} title={t("common:location.title")} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center min-h-[20px]">
              <Label htmlFor="country" className={errors.country ? "text-destructive" : ""}>
                {t("pets:form.country")}
              </Label>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full">
                    <CountrySelect
                      value={formData.country}
                      onValueChange={(value) => {
                        updateField("country")(value);

                        const mappedPrefix = countryPrefixMap.get(value);
                        if (mappedPrefix) {
                          setPhonePrefix(mappedPrefix);
                          syncPhoneNumber(mappedPrefix, phoneDigits);
                        }
                      }}
                      showPhonePrefix={false}
                      disabled={citiesValue.length > 0}
                      data-testid="country-select"
                    />
                  </div>
                </TooltipTrigger>
                {citiesValue.length > 0 && (
                  <TooltipContent>
                    <p>{t("helper:form.clearCitiesToChangeCountry")}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            {errors.country && (
              <p className="text-sm font-medium text-destructive">{errors.country}</p>
            )}
          </div>
          <div className="space-y-2">
            <CitySelect
              id="cities"
              label={t("helper:form.cities")}
              multiple
              country={formData.country || null}
              value={citiesValue}
              onChange={
                onCitiesChange ??
                (() => {
                  /* noop */
                })
              }
              error={errors.city}
            />
          </div>
        </div>
        <div className="mt-4">
          <FormField
            id="address"
            label={t("helper:form.address")}
            value={formData.address}
            onChange={updateField("address")}
            error={errors.address}
            placeholder={t("helper:form.addressPlaceholder")}
          />
        </div>
      </section>

      <section>
        <FormSectionHeader icon={Phone} title={t("helper:form.contactInfo")} />
        <div className="space-y-4">
          <div className="space-y-2 md:max-w-sm">
            <Label htmlFor="phone_number" className={errors.phone_number ? "text-destructive" : ""}>
              {t("helper:form.phoneNumber")}
            </Label>
            <div className="flex">
              <Select
                value={phonePrefix}
                onValueChange={(nextPrefix) => {
                  setPhonePrefix(nextPrefix);
                  syncPhoneNumber(nextPrefix, phoneDigits);
                }}
              >
                <SelectTrigger id="phone_prefix" className="w-36 rounded-r-none border-r-0">
                  <SelectValue placeholder={t("helper:form.selectPhoneCountryCode")} />
                </SelectTrigger>
                <SelectContent>
                  {phonePrefixOptions.map((prefix) => (
                    <SelectItem key={prefix} value={prefix}>
                      {prefix}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="phone_number"
                name="phone_number"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="rounded-l-none"
                value={phoneDigits}
                onChange={(event) => {
                  const onlyDigits = event.target.value.replace(/\D/g, "");
                  setPhoneDigits(onlyDigits);
                  syncPhoneNumber(phonePrefix, onlyDigits);
                }}
                placeholder={t("helper:form.phoneDigitsPlaceholder")}
                aria-invalid={!!errors.phone_number}
                aria-describedby={errors.phone_number ? "phone_number-error" : undefined}
              />
            </div>
            {errors.phone_number && (
              <p id="phone_number-error" className="text-sm font-medium text-destructive">
                {errors.phone_number}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label>{t("helper:form.additionalContact")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Contact info help"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <CircleHelp className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="max-w-xs text-sm" side="top">
                  <p>{t("helper:form.additionalContactHelp")}</p>
                </PopoverContent>
              </Popover>
            </div>

            {formData.contact_details.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("helper:form.noAdditionalContacts")}
              </p>
            ) : (
              <div className="space-y-3">
                {formData.contact_details.map((contactDetail, index) => {
                  const typeError = errors[`contact_details.${index}.type`];
                  const valueError = errors[`contact_details.${index}.value`];
                  const normalizedValue = normalizeContactDetailValue(
                    contactDetail.type,
                    contactDetail.value,
                  );
                  const previewHref = normalizedValue
                    ? getContactDetailHref({
                        type: contactDetail.type,
                        value: normalizedValue,
                      })
                    : null;
                  const previewText = normalizedValue
                    ? getContactDetailDisplayText({
                        type: contactDetail.type,
                        value: normalizedValue,
                      })
                    : null;

                  return (
                    <div
                      key={`${contactDetail.type}-${index}`}
                      className="space-y-3 rounded-lg border p-3"
                    >
                      <div className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)_auto]">
                        <div className="space-y-2">
                          <Label
                            htmlFor={`contact-type-${index}`}
                            className={typeError ? "text-destructive" : ""}
                          >
                            {t("helper:form.contactType")}
                          </Label>
                          <Select
                            value={contactDetail.type}
                            onValueChange={(nextType) => {
                              const nextContactDetails = [...formData.contact_details];
                              nextContactDetails[index] = {
                                type: nextType as HelperContactDetail["type"],
                                value: "",
                              };
                              updateContactDetails(nextContactDetails);
                            }}
                          >
                            <SelectTrigger id={`contact-type-${index}`} aria-invalid={!!typeError}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {contactDetailOptions.map((option) => (
                                <SelectItem
                                  key={option.type}
                                  value={option.type}
                                  disabled={
                                    option.type !== contactDetail.type &&
                                    option.unique &&
                                    usedUniqueTypes.has(option.type)
                                  }
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {typeError && (
                            <p className="text-sm font-medium text-destructive">{typeError}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor={`contact-value-${index}`}
                            className={valueError ? "text-destructive" : ""}
                          >
                            {t("helper:form.contactValue")}
                          </Label>
                          <Input
                            id={`contact-value-${index}`}
                            value={contactDetail.value}
                            onChange={(event) => {
                              const nextContactDetails = [...formData.contact_details];
                              nextContactDetails[index] = {
                                ...contactDetail,
                                value: event.target.value,
                              };
                              updateContactDetails(nextContactDetails);
                            }}
                            placeholder={
                              contactDetailOptions.find(
                                (option) => option.type === contactDetail.type,
                              )?.placeholder
                            }
                            aria-invalid={!!valueError}
                          />
                          {valueError ? (
                            <p className="text-sm font-medium text-destructive">{valueError}</p>
                          ) : previewText ? (
                            <p className="break-all text-xs text-muted-foreground">
                              {t("helper:form.contactPreviewLabel")}{" "}
                              {previewHref ? (
                                <a
                                  href={previewHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline underline-offset-4"
                                >
                                  {previewText}
                                </a>
                              ) : (
                                <span>{previewText}</span>
                              )}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              updateContactDetails(
                                formData.contact_details.filter(
                                  (_, rowIndex) => rowIndex !== index,
                                ),
                              );
                            }}
                            aria-label={t("helper:form.removeContact")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                updateContactDetails([
                  ...formData.contact_details,
                  createDefaultContactDetail(formData.contact_details),
                ]);
              }}
              className="w-full justify-center"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("helper:form.addContact")}
            </Button>
          </div>
        </div>
      </section>

      <section>
        <FormSectionHeader icon={Briefcase} title={t("helper:form.experienceHouseholdSection")} />
        <div className="space-y-4">
          <FormField
            id="experience"
            label={t("helper:form.experience")}
            type="textarea"
            value={formData.experience}
            onChange={updateField("experience")}
            error={errors.experience}
            placeholder={t("helper:form.experiencePlaceholder")}
          />
          <div className="flex flex-wrap gap-6">
            <CheckboxField
              id="has_pets"
              label={t("helper:form.hasPets")}
              checked={formData.has_pets}
              onChange={updateField("has_pets")}
              error={errors.has_pets}
            />
            <CheckboxField
              id="has_children"
              label={t("helper:form.hasChildren")}
              checked={formData.has_children}
              onChange={updateField("has_children")}
              error={errors.has_children}
            />
          </div>
        </div>
      </section>

      <section>
        <FormSectionHeader icon={ClipboardList} title={t("helper:form.placementTypes")} />
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("helper:form.requestTypesDescription")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {requestTypeOptions.map((option) => {
              const checked = formData.request_types.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                    checked ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      const nextValue = Boolean(value);
                      const nextTypes = nextValue
                        ? [...formData.request_types, option.value]
                        : formData.request_types.filter((type) => type !== option.value);
                      updateField("request_types")(nextTypes);
                    }}
                  />
                  <span className="text-sm font-medium">{option.label}</span>
                </label>
              );
            })}
          </div>
          {errors.request_types && (
            <p className="text-sm font-medium text-destructive">{errors.request_types}</p>
          )}
          {shouldShowOfferField ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="offer" className={errors.offer ? "text-destructive" : ""}>
                  Offer
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Offer hint"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <CircleHelp className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="max-w-xs text-sm" side="top">
                    <p>Describe your offer</p>
                  </PopoverContent>
                </Popover>
              </div>
              <Textarea
                id="offer"
                value={formData.offer}
                onChange={(event) => {
                  updateField("offer")(event);
                }}
                aria-invalid={!!errors.offer}
              />
              {errors.offer ? (
                <p className="text-sm font-medium text-destructive">{errors.offer}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};
