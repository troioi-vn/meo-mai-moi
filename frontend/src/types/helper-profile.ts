export interface HelperProfileUser {
  id?: number
  name?: string
  email?: string
}

export interface HelperProfile {
  id: number
  country?: string
  address?: string
  city?: string
  state?: string
  phone_number?: string
  experience?: string
  has_pets?: boolean
  has_children?: boolean
  can_foster?: boolean
  can_adopt?: boolean
  is_public?: boolean
  status?: string
  user?: HelperProfileUser
}
