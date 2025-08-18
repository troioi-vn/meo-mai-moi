import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle } from 'lucide-react'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreference,
  type UpdatePreferenceRequest,
} from '@/api/notification-preferences'

interface NotificationPreferencesState {
  preferences: NotificationPreference[]
  loading: boolean
  error: string | null
  updating: boolean
  updateSuccess: boolean
}

export function NotificationPreferences() {
  const [state, setState] = useState<NotificationPreferencesState>({
    preferences: [],
    loading: true,
    error: null,
    updating: false,
    updateSuccess: false,
  })

  // Load preferences on component mount
  useEffect(() => {
  void loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const response = await getNotificationPreferences()
      setState(prev => ({
        ...prev,
        preferences: response.data,
        loading: false,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load notification preferences',
      }))
    }
  }

  const updatePreference = async (type: string, field: 'email_enabled' | 'in_app_enabled', value: boolean) => {
    // Snapshot previous preferences so we can revert on error
    const previousPreferences = state.preferences

    try {
      setState(prev => ({ ...prev, updating: true, error: null, updateSuccess: false }))

      // Optimistically update the UI
      setState(prev => ({
        ...prev,
        preferences: prev.preferences.map(pref =>
          pref.type === type ? { ...pref, [field]: value } : pref
        ),
      }))

      // Find the current preference from the snapshot to get both values
      const currentPreference = previousPreferences.find(pref => pref.type === type)
      if (!currentPreference) {
        throw new Error('Preference not found')
      }

      // Create the update request with both current values
      const updateRequest: UpdatePreferenceRequest = {
        type,
        email_enabled: field === 'email_enabled' ? value : currentPreference.email_enabled,
        in_app_enabled: field === 'in_app_enabled' ? value : currentPreference.in_app_enabled,
      }

  await updateNotificationPreferences([updateRequest])

      setState(prev => ({
        ...prev,
        updating: false,
        updateSuccess: true,
      }))

      // Clear success message after 3 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, updateSuccess: false }))
      }, 3000)
    } catch (error) {
      // Revert the optimistic update on error and preserve the error message
      setState(prev => ({
        ...prev,
        updating: false,
        error: error instanceof Error ? error.message : 'Failed to update preference',
        preferences: previousPreferences,
      }))
      // Do not reload preferences here because that would clear the error immediately
    }
  }

  if (state.loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Notification Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Control how you receive notifications for different events.
          </p>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Notification Type</TableHead>
                <TableHead className="text-center">Email</TableHead>
                <TableHead className="text-center">In-App</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4].map(i => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-11 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-11 mx-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  if (state.error && state.preferences.length === 0) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Notification Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Control how you receive notifications for different events.
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Notification Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Control how you receive notifications for different events.
        </p>
      </div>

      {state.updateSuccess && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Notification preferences updated successfully.</AlertDescription>
        </Alert>
      )}

      {state.error && (
        <Alert variant="destructive" data-testid="error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state.preferences.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Notification Type</TableHead>
                <TableHead className="text-center">Email</TableHead>
                <TableHead className="text-center">In-App</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.preferences.map(preference => (
                <TableRow key={preference.type}>
                  <TableCell className="font-medium">{preference.label}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={preference.email_enabled}
                      onCheckedChange={value => void updatePreference(preference.type, 'email_enabled', value)}
                      disabled={state.updating}
                      aria-label={`Toggle email notifications for ${preference.label}`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={preference.in_app_enabled}
                      onCheckedChange={value => void updatePreference(preference.type, 'in_app_enabled', value)}
                      disabled={state.updating}
                      aria-label={`Toggle in-app notifications for ${preference.label}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No notification types available.
        </p>
      )}
    </div>
  )
}