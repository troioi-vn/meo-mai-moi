import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/use-toast'
import { AxiosError } from 'axios'

interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

interface ChangePasswordFormProps {
  onSuccess?: () => void
}

const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation(['auth', 'common', 'validation'])
  const { changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const passwordChangeSchema = z
    .object({
      current_password: z.string().min(1, { message: t('validation:required') }),
      new_password: z.string().min(8, { message: t('validation:password.min', { min: 8 }) }),
      new_password_confirmation: z.string().min(1, { message: t('validation:required') }),
    })
    .refine((data) => data.new_password === data.new_password_confirmation, {
      message: t('validation:password.match'),
      path: ['new_password_confirmation'],
    })

  type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  })

  const onSubmit = async (values: PasswordChangeFormValues): Promise<void> => {
    setIsLoading(true)
    try {
      await changePassword(
        values.current_password,
        values.new_password,
        values.new_password_confirmation
      )
      toast({
        title: t('auth:changePassword.successTitle'),
        description: t('auth:changePassword.successDescription'),
      })
      form.reset()
      // Call onSuccess callback if provided (e.g., to close a dialog)
      if (onSuccess) {
        onSuccess()
      }
      // Security: force logout and redirect to login after password change
      try {
        await logout()
      } catch {
        /* ignore logout error */
      }
      void navigate('/login')
    } catch (error: unknown) {
      let errorMessage = t('common:errors.generic')
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<ApiError>
        errorMessage = axiosError.response?.data.message ?? axiosError.message
        if (axiosError.response?.data.errors) {
          const serverErrors = axiosError.response.data.errors
          for (const key in serverErrors) {
            if (Object.prototype.hasOwnProperty.call(serverErrors, key)) {
              form.setError(key as keyof PasswordChangeFormValues, {
                type: 'server',
                message: serverErrors[key]?.[0] ?? '',
              })
            }
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      toast({
        title: t('auth:changePassword.failedTitle'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
        <FormField
          control={form.control as unknown as Control}
          name="current_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth:changePassword.currentPassword')}</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as unknown as Control}
          name="new_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth:changePassword.newPassword')}</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as unknown as Control}
          name="new_password_confirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth:changePassword.confirmNewPassword')}</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('auth:changePassword.changing') : t('auth:changePassword.submit')}
        </Button>
      </form>
    </Form>
  )
}

export { ChangePasswordForm }
