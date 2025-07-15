'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { Controller, FormProvider, useFormContext } from 'react-hook-form'

import { cn } from '@/lib/utils'
import { FormFieldContext } from './form-context'
import { FormItemContext } from './form-item-context'

const Form = FormProvider

const FormField = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Controller> & { className?: string }) => {
  const id = React.useId()

  return (
    <FormFieldContext.Provider value={React.useMemo(() => ({ name: props.name }), [props.name])}>
      <FormItemContext.Provider value={React.useMemo(() => ({ id }), [id])}>
        <Controller
          {...props}
          render={({ field, fieldState, formState }) => {
            return (
              <div className={cn('space-y-2', className)}>
                {props.render({
                  field,
                  fieldState,
                  formState,
                })}
              </div>
            )
          }}
        />
      </FormItemContext.Provider>
    </FormFieldContext.Provider>
  )
}

const FormItem = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.RefObject<HTMLDivElement | null> }) => {
  const { name } = React.use(FormFieldContext)
  const { id } = React.use(FormItemContext)
  const { formState } = useFormContext()

  const error = formState.errors[name]
  const formItemId = `${id}-${name}`
  const formDescriptionId = `${formItemId}-description`
  const formMessageId = `${formItemId}-message`

  return (
    <div
      ref={ref}
      className={cn('space-y-2', className)}
      id={formItemId}
      aria-describedby={!error ? formDescriptionId : formMessageId}
      {...props}
    />
  )
}
FormItem.displayName = 'FormItem'

const FormLabel = ({
  ref,
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & {
  ref?: React.RefObject<HTMLLabelElement | null>
}) => {
  const { id } = React.use(FormItemContext)
  const { name } = React.use(FormFieldContext)
  const formItemId = `${id}-${name}`

  return (
    <label
      ref={ref}
      className={cn('block text-sm font-medium text-gray-700 dark:text-gray-300', className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}
FormLabel.displayName = 'FormLabel'

const FormControl = ({
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof Slot> & {
  ref?: React.RefObject<React.ComponentRef<typeof Slot> | null>
}) => {
  const { id } = React.use(FormItemContext)
  const { name } = React.use(FormFieldContext)
  const { formState } = useFormContext()

  const error = formState.errors[name]
  const formItemId = `${id}-${name}`
  const formDescriptionId = `${formItemId}-description`
  const formMessageId = `${formItemId}-message`

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !formDescriptionId ? formMessageId : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
}
FormControl.displayName = 'FormControl'

const FormDescription = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.RefObject<HTMLParagraphElement | null>
}) => {
  const { id } = React.use(FormItemContext)
  const { name } = React.use(FormFieldContext)
  const formItemId = `${id}-${name}`
  const formDescriptionId = `${formItemId}-description`

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn('text-[0.8rem] text-muted-foreground', className)}
      {...props}
    />
  )
}
FormDescription.displayName = 'FormDescription'

const FormMessage = ({
  ref,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.RefObject<HTMLParagraphElement | null>
}) => {
  const { name } = React.use(FormFieldContext)
  const { formState } = useFormContext()
  const { id } = React.use(FormItemContext)

  const error = formState.errors[name]
  const formItemId = `${id}-${name}`
  const formMessageId = `${formItemId}-message`

  const body = error ? (typeof error.message === 'string' ? error.message : (error.message ? JSON.stringify(error.message) : 'Error occurred')) : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn('text-[0.8rem] font-medium text-destructive', className)}
      {...props}
    >
      {body}
    </p>
  )
}
FormMessage.displayName = 'FormMessage'

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
}
