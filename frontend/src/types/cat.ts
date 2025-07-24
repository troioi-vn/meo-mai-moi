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
  placement_requests?: PlacementRequest[];
}

export interface PlacementRequest {
  id: number;
  cat_id: number;
  user_id: number;
  request_type: 'foster_payed' | 'foster_free' | 'permanent';
  status: 'open' | 'pending_review' | 'fulfilled' | 'expired' | 'cancelled';
  notes: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
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
