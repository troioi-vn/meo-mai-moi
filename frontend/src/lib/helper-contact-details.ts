import type { HelperContactDetail, HelperContactDetailType } from "@/types/helper-profile";

interface ContactDetailOption {
  type: HelperContactDetailType;
  labelKey: string;
  placeholderKey: string;
  unique: boolean;
}

const CONTACT_DETAIL_OPTIONS: ContactDetailOption[] = [
  {
    type: "telegram",
    labelKey: "helper:contactTypes.telegram",
    placeholderKey: "helper:form.contactPlaceholders.telegram",
    unique: true,
  },
  {
    type: "whatsapp",
    labelKey: "helper:contactTypes.whatsapp",
    placeholderKey: "helper:form.contactPlaceholders.whatsapp",
    unique: true,
  },
  {
    type: "zalo",
    labelKey: "helper:contactTypes.zalo",
    placeholderKey: "helper:form.contactPlaceholders.zalo",
    unique: true,
  },
  {
    type: "facebook",
    labelKey: "helper:contactTypes.facebook",
    placeholderKey: "helper:form.contactPlaceholders.facebook",
    unique: true,
  },
  {
    type: "instagram",
    labelKey: "helper:contactTypes.instagram",
    placeholderKey: "helper:form.contactPlaceholders.instagram",
    unique: true,
  },
  {
    type: "x_twitter",
    labelKey: "helper:contactTypes.x_twitter",
    placeholderKey: "helper:form.contactPlaceholders.x_twitter",
    unique: true,
  },
  {
    type: "linkedin",
    labelKey: "helper:contactTypes.linkedin",
    placeholderKey: "helper:form.contactPlaceholders.linkedin",
    unique: true,
  },
  {
    type: "tiktok",
    labelKey: "helper:contactTypes.tiktok",
    placeholderKey: "helper:form.contactPlaceholders.tiktok",
    unique: true,
  },
  {
    type: "wechat",
    labelKey: "helper:contactTypes.wechat",
    placeholderKey: "helper:form.contactPlaceholders.wechat",
    unique: true,
  },
  {
    type: "viber",
    labelKey: "helper:contactTypes.viber",
    placeholderKey: "helper:form.contactPlaceholders.viber",
    unique: true,
  },
  {
    type: "line",
    labelKey: "helper:contactTypes.line",
    placeholderKey: "helper:form.contactPlaceholders.line",
    unique: true,
  },
  {
    type: "website",
    labelKey: "helper:contactTypes.website",
    placeholderKey: "helper:form.contactPlaceholders.website",
    unique: true,
  },
  {
    type: "email",
    labelKey: "helper:contactTypes.email",
    placeholderKey: "helper:form.contactPlaceholders.email",
    unique: true,
  },
  {
    type: "other",
    labelKey: "helper:contactTypes.other",
    placeholderKey: "helper:form.contactPlaceholders.other",
    unique: false,
  },
];

const RESERVED_FACEBOOK_SEGMENTS = new Set([
  "pages",
  "groups",
  "watch",
  "marketplace",
  "share",
  "login",
  "profile.php",
]);

export const getContactDetailOptions = (t: (key: string) => string) =>
  CONTACT_DETAIL_OPTIONS.map((option) => ({
    ...option,
    label: t(option.labelKey),
    placeholder: t(option.placeholderKey),
  }));

export const isUniqueContactDetailType = (type: HelperContactDetailType) =>
  CONTACT_DETAIL_OPTIONS.find((option) => option.type === type)?.unique ?? false;

export const normalizeContactDetailValue = (
  type: HelperContactDetailType,
  value: string,
): string | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  switch (type) {
    case "telegram":
      return normalizeTelegram(trimmed);
    case "whatsapp":
      return normalizeWhatsapp(trimmed);
    case "facebook":
      return normalizeFacebook(trimmed);
    case "instagram":
      return normalizeInstagram(trimmed);
    case "x_twitter":
      return normalizeX(trimmed);
    case "linkedin":
      return normalizeLinkedIn(trimmed);
    case "tiktok":
      return normalizeTiktok(trimmed);
    case "website":
      return normalizeWebsite(trimmed);
    case "email":
      return normalizeEmail(trimmed);
    case "zalo":
    case "wechat":
    case "viber":
    case "line":
    case "other":
      return normalizePlainText(trimmed);
  }
};

export const validateContactDetails = (
  contactDetails: HelperContactDetail[],
  t: (key: string) => string,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const seenTypes = new Set<HelperContactDetailType>();

  contactDetails.forEach((contactDetail, index) => {
    if (isUniqueContactDetailType(contactDetail.type)) {
      if (seenTypes.has(contactDetail.type)) {
        errors[`contact_details.${index}.type`] = t("helper:form.contactTypeDuplicate");
      } else {
        seenTypes.add(contactDetail.type);
      }
    }

    const normalized = normalizeContactDetailValue(contactDetail.type, contactDetail.value);
    if (!normalized) {
      errors[`contact_details.${index}.value`] = t(
        `helper:form.contactErrors.${contactDetail.type}`,
      );
    }
  });

  return errors;
};

export const normalizeContactDetailsForSubmit = (contactDetails: HelperContactDetail[]) =>
  contactDetails
    .map((contactDetail) => {
      const normalizedValue = normalizeContactDetailValue(contactDetail.type, contactDetail.value);
      if (!normalizedValue) {
        return null;
      }

      return {
        type: contactDetail.type,
        value: normalizedValue,
      } satisfies HelperContactDetail;
    })
    .filter((contactDetail): contactDetail is HelperContactDetail => contactDetail !== null);

export const getContactDetailHref = (
  contactDetail: Pick<HelperContactDetail, "type" | "value">,
): string | null => {
  switch (contactDetail.type) {
    case "telegram":
      return `https://t.me/${contactDetail.value}`;
    case "whatsapp":
      return `https://wa.me/${contactDetail.value}`;
    case "facebook":
      return `https://www.facebook.com/${contactDetail.value}`;
    case "instagram":
      return `https://www.instagram.com/${contactDetail.value}`;
    case "x_twitter":
      return `https://x.com/${contactDetail.value}`;
    case "linkedin":
      return `https://www.linkedin.com/in/${contactDetail.value}`;
    case "tiktok":
      return `https://www.tiktok.com/@${contactDetail.value}`;
    case "website":
      return contactDetail.value;
    case "email":
      return `mailto:${contactDetail.value}`;
    default:
      return null;
  }
};

export const getContactDetailDisplayText = (
  contactDetail: Pick<HelperContactDetail, "type" | "value">,
) => getContactDetailHref(contactDetail) ?? contactDetail.value;

export const createDefaultContactDetail = (
  existingContactDetails: HelperContactDetail[],
): HelperContactDetail => {
  const usedTypes = new Set(
    existingContactDetails
      .filter((contactDetail) => isUniqueContactDetailType(contactDetail.type))
      .map((contactDetail) => contactDetail.type),
  );

  const nextUniqueOption = CONTACT_DETAIL_OPTIONS.find(
    (option) => option.unique && !usedTypes.has(option.type),
  );

  return {
    type: nextUniqueOption?.type ?? "other",
    value: "",
  };
};

const normalizePlainText = (value: string) => value.replace(/\s+/g, " ").trim();

const normalizeTelegram = (value: string) => {
  const directMatch = /^@?([A-Za-z0-9_]{5,32})$/.exec(value);
  if (directMatch) {
    return directMatch[1] ?? null;
  }

  const urlMatch = /^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/@?([A-Za-z0-9_]{5,32})\/?$/i.exec(
    value,
  );
  return urlMatch?.[1] ?? null;
};

const normalizeWhatsapp = (value: string) => {
  const digitsOnly = value.replace(/\D+/g, "");
  if (/^\d{7,15}$/.test(digitsOnly)) {
    return digitsOnly;
  }

  const waMatch = /^(?:https?:\/\/)?wa\.me\/(\d{7,15})\/?$/i.exec(value);
  if (waMatch) {
    return waMatch[1] ?? null;
  }

  try {
    const url = new URL(value);
    if (url.hostname.includes("whatsapp.com")) {
      const phone = (url.searchParams.get("phone") ?? "").replace(/\D+/g, "");
      return /^\d{7,15}$/.test(phone) ? phone : null;
    }
  } catch {
    return null;
  }

  return null;
};

const normalizeFacebook = (value: string) => {
  const directMatch = /^([A-Za-z0-9_.-]+)$/.exec(value);
  if (directMatch) {
    return rejectReservedFacebookSegment(directMatch[1] ?? "");
  }

  const urlMatch = /^(?:https?:\/\/)?(?:www\.)?facebook\.com\/([A-Za-z0-9_.-]+)\/?$/i.exec(value);
  return urlMatch ? rejectReservedFacebookSegment(urlMatch[1] ?? "") : null;
};

const rejectReservedFacebookSegment = (segment: string) =>
  RESERVED_FACEBOOK_SEGMENTS.has(segment.toLowerCase()) ? null : segment;

const normalizeInstagram = (value: string) => {
  const directMatch = /^@?([A-Za-z0-9._]{1,30})$/.exec(value);
  if (directMatch) {
    return directMatch[1] ?? null;
  }

  const urlMatch = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?$/i.exec(
    value,
  );
  return urlMatch?.[1] ?? null;
};

const normalizeX = (value: string) => {
  const directMatch = /^@?([A-Za-z0-9_]{1,15})$/.exec(value);
  if (directMatch) {
    return directMatch[1] ?? null;
  }

  const urlMatch = /^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/?$/i.exec(
    value,
  );
  return urlMatch?.[1] ?? null;
};

const normalizeLinkedIn = (value: string) => {
  const directMatch = /^([A-Za-z0-9-]{3,100})$/.exec(value);
  if (directMatch) {
    return directMatch[1] ?? null;
  }

  const urlMatch = /^(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9-]{3,100})\/?$/i.exec(
    value,
  );
  return urlMatch?.[1] ?? null;
};

const normalizeTiktok = (value: string) => {
  const directMatch = /^@?([A-Za-z0-9._]{2,24})$/.exec(value);
  if (directMatch) {
    return directMatch[1] ?? null;
  }

  const urlMatch = /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([A-Za-z0-9._]{2,24})\/?$/i.exec(
    value,
  );
  return urlMatch?.[1] ?? null;
};

const normalizeWebsite = (value: string) => {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
};

const normalizeEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.toLowerCase() : null;
