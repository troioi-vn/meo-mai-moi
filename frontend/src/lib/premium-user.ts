interface PremiumAwareUser {
  roles?: string[]
  is_premium?: boolean | null
}

export function isPremiumUser(user: PremiumAwareUser | null | undefined): boolean {
  if (!user) {
    return false
  }

  return Boolean(user.is_premium) || user.roles?.includes('premium') === true
}
