export interface Cat {
  id: number
  name: string
  breed: string
  birthday: string // Changed from age to birthday (ISO date string)
  location: string
  description: string
  user_id: number
  status: 'active' | 'lost' | 'deceased' | 'deleted'
  imageUrl?: string
  photo_url?: string // Backend API photo URL
  photo?: { id: number; url: string } | null
  created_at: string
  updated_at: string
  user: {
    id: number
    name: string
    email: string
    location?: string
  }
  viewer_permissions?: {
    can_edit: boolean
    can_view_contact: boolean
  }
  placement_requests?: PlacementRequest[]
  // Convenience flag from backend (optional) used by CatCard
  placement_request_active?: boolean
}

export interface PlacementRequest {
  id: number;
  cat_id: number;
  user_id: number;
  // Support backend enums and existing test/mocks values
  request_type: 'foster_payed' | 'foster_free' | 'permanent' | 'fostering' | 'permanent_foster' | 'adoption';
  status: 'open' | 'pending_review' | 'fulfilled' | 'expired' | 'cancelled';
  notes: string;
  expires_at?: string;
  // Optional date-range fields used by filters/tests
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  transfer_requests?: TransferRequest[];
  created_at: string;
  updated_at: string;
}

export interface TransferRequest {
  id: number;
  cat_id?: number;
  placement_request_id?: number;
  helper_profile_id?: number;
  initiator_user_id?: number;
  requested_relationship_type?: 'fostering' | 'permanent_foster' | 'adoption' | string;
  status?: 'pending' | 'accepted' | 'rejected' | string;
  helper_profile?: {
    id?: number;
  city?: string;
  state?: string;
    user?: { id?: number; name?: string; email?: string };
  };
}

// Helper function to calculate age from birthday
export const calculateAge = (birthday: string): number => {
  const today = new Date()
  const birthDate = new Date(birthday)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}
