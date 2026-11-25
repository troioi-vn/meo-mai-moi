import { toast as sonnerToast } from 'sonner'
import i18n from '@/i18n'

type ToastOptions = Parameters<typeof sonnerToast>[1]
type ToastFn = (key: string, options?: ToastOptions) => string | number

// Spelled out because the inferred type of `raw` uses interfaces sonner does not export.
interface I18nToast {
  success: ToastFn
  error: ToastFn
  warning: ToastFn
  info: ToastFn
  message: ToastFn
  raw: typeof sonnerToast
}

/**
 * i18n-aware toast wrapper.
 * Accepts translation keys and automatically translates them.
 *
 * Usage:
 *   toast.success('common:messages.success')
 *   toast.error('auth:login.error')
 *   toast.success('pets:messages.created', { description: 'Additional info' })
 */
export const toast: I18nToast = {
  success: (key: string, options?: ToastOptions) => {
    const message = i18n.t(key)
    return sonnerToast.success(message, options)
  },

  error: (key: string, options?: ToastOptions) => {
    const message = i18n.t(key)
    return sonnerToast.error(message, options)
  },

  warning: (key: string, options?: ToastOptions) => {
    const message = i18n.t(key)
    return sonnerToast.warning(message, options)
  },

  info: (key: string, options?: ToastOptions) => {
    const message = i18n.t(key)
    return sonnerToast.info(message, options)
  },

  message: (key: string, options?: ToastOptions) => {
    const message = i18n.t(key)
    return sonnerToast.message(message, options)
  },

  /**
   * For cases where you already have a translated message (e.g., from API).
   */
  raw: sonnerToast,
}
