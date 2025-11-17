/**
 * Legacy profile experience has moved to the Settings page.
 * This stub is kept only to avoid stray imports during the refactor window.
 */
const RemovedProfilePage = () => {
  if (import.meta.env.DEV) {
    throw new Error(
      'ProfilePage has been removed. Use /settings/account (SettingsPage) instead of /account.'
    )
  }
  return null
}

export default RemovedProfilePage
