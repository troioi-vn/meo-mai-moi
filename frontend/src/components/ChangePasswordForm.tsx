import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { AxiosError } from 'axios';

interface ApiError {
  message: string;
  errors?: { [key: string]: string[] };
}

const passwordChangeSchema = z.object({
  current_password: z.string().min(1, { message: 'Current password is required.' }),
  new_password: z.string().min(8, { message: 'New password must be at least 8 characters.' }),
  new_password_confirmation: z.string().min(1, { message: 'Confirm new password is required.' }),
}).refine((data) => data.new_password === data.new_password_confirmation, {
  message: 'New password and confirmation do not match.',
  path: ['new_password_confirmation'],
});

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

const ChangePasswordForm: React.FC = () => {
  const { changePassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  });

  const onSubmit = async (values: PasswordChangeFormValues) => {
    setIsLoading(true);
    try {
      await changePassword(values.current_password, values.new_password, values.new_password_confirmation);
      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully.',
      });
      form.reset();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiError>;
      toast({
        title: 'Password Change Failed',
        description: axiosError.response?.data?.message || axiosError.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
      if (axiosError.response?.data?.errors) {
        for (const key in axiosError.response.data.errors) {
          form.setError(key as keyof PasswordChangeFormValues, {
            type: 'server',
            message: axiosError.response.data.errors[key][0],
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control as any}
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
          control={form.control as any}
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
          control={form.control as any}
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
  );
};

export default ChangePasswordForm;
