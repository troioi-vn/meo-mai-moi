import type { City, Pet, PlacementRequest } from "@/types/pet";
import type { PlacementRequestResponse } from "@/types/placement";

export interface HelperProfileUser {
  id?: number;
  name?: string;
  email?: string;
}

export interface HelperProfilePhoto {
  id: number;
  url?: string;
  thumb_url?: string | null;
  is_primary?: boolean;
  path?: string;
}

export type PlacementRequestType = "foster_paid" | "foster_free" | "permanent" | "pet_sitting";
export type HelperProfileStatus = "private" | "public" | "archived" | "deleted";
export type HelperContactDetailType =
  | "telegram"
  | "whatsapp"
  | "zalo"
  | "facebook"
  | "instagram"
  | "x_twitter"
  | "linkedin"
  | "tiktok"
  | "wechat"
  | "viber"
  | "line"
  | "website"
  | "email"
  | "other";

export interface HelperContactDetail {
  type: HelperContactDetailType;
  value: string;
}

export const isHelperProfileActiveStatus = (status?: HelperProfileStatus | "active") =>
  status === undefined || status === "active" || status === "private" || status === "public";

export interface HelperProfile {
  id: number;
  user_id?: number;
  country?: string;
  address?: string;
  city_id?: number | null;
  city?: string | City;
  cities?: City[];
  state?: string;
  zip_code?: string;
  phone_number?: string;
  phone?: string;
  contact_details?: HelperContactDetail[];
  experience?: string;
  offer?: string | null;
  about?: string;
  has_pets?: boolean;
  has_children?: boolean;
  request_types?: PlacementRequestType[];
  approval_status?: string;
  approved_at?: string | null;
  status?: HelperProfileStatus;
  user?: HelperProfileUser;
  photos?: HelperProfilePhoto[];
  pet_types?: { id: number; name: string; placement_requests_allowed: boolean }[];
  // Updated: now using PlacementRequestResponse instead of TransferRequest
  placement_responses?: (PlacementRequestResponse & {
    placement_request?: PlacementRequest;
    pet?: Pet;
  })[];
  created_at?: string;
  updated_at?: string;
  archived_at?: string;
  restored_at?: string;
}
