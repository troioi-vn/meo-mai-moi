export interface HelperProfileUser {
  id?: number
  name?: string
  email?: string
}

export interface HelperProfile {
  id: number
  user_id?: number
  country?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  phone_number?: string
  phone?: string
  experience?: string
  about?: string
  has_pets?: boolean
  has_children?: boolean
  can_foster?: boolean
  can_adopt?: boolean
  is_public?: boolean
  status?: string
  user?: HelperProfileUser
  photos?: unknown[]
  created_at?: string
  updated_at?: string
}
