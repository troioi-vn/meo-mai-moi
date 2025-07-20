import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
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

const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, { message: 'Current password is required.' }),
    new_password: z.string().min(8, { message: 'New password must be at least 8 characters.' }),
    new_password_confirmation: z.string().min(1, { message: 'Confirm new password is required.' }),
  })
  .refine((data) => data.new_password === data.new_password_confirmation, {
    message: 'New password and confirmation do not match.',
    path: ['new_password_confirmation'],
  })

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>

const ChangePasswordForm: React.FC = () => {
  const { changePassword } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

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
        title: 'Password Changed',
        description: 'Your password has been updated successfully.',
      })
      form.reset()
    } catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred.'
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<ApiError>
        errorMessage = axiosError.response?.data.message ?? axiosError.message
        if (axiosError.response?.data.errors) {
          for (const key in axiosError.response.data.errors) {
            form.setError(key as keyof PasswordChangeFormValues, {
              type: 'server',
              message: axiosError.response.data.errors[key][0],
            })
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      toast({
        title: 'Password Change Failed',
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
          control={form.control}
          name="current_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="new_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="new_password_confirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Changing...' : 'Change Password'}
        </Button>
      </form>
    </Form>
  )
}

export { ChangePasswordForm }
