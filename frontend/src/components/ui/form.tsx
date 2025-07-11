"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Controller, FormProvider, useFormContext } from "react-hook-form"

import { cn } from "@/lib/utils"

// --- New Contexts ---
type FormFieldContextValue = {
  name: string
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)
// --- End New Contexts ---

const Form = FormProvider

const FormField = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof Controller> & { className?: string }) => {
  const id = React.useId() // Generate a unique ID for the field

  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <FormItemContext.Provider value={{ id }}>
        <Controller
          {...props}
          render={({ field, fieldState, formState }) => {
            return (
              <div className={cn("space-y-2", className)}>
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

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((
  { className, ...props }, ref
) => {
  const { name } = React.useContext(FormFieldContext)
  const { id } = React.useContext(FormItemContext)
  const { formState } = useFormContext()

  const error = formState.errors[name]
  const formItemId = `${id}-${name}`
  const formDescriptionId = `${formItemId}-description`
  const formMessageId = `${formItemId}-message`

  return (
    <div
      ref={ref}
      className={cn("space-y-2", className)}
      id={formItemId}
      aria-describedby={!error ? formDescriptionId : formMessageId}
      {...props}
    />
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>((
  { className, ...props }, ref
) => {
  const { id } = React.useContext(FormItemContext)
  const { name } = React.useContext(FormFieldContext)
  const formItemId = `${id}-${name}`

  return (
    <label
      ref={ref}
      className={cn("block text-sm font-medium text-gray-700 dark:text-gray-300", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<React.ElementRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>>((
  { ...props }, ref
) => {
  const { id } = React.useContext(FormItemContext)
  const { name } = React.useContext(FormFieldContext)
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
        !formDescriptionId
          ? `${formMessageId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { id } = React.useContext(FormItemContext)
  const { name } = React.useContext(FormFieldContext)
  const formItemId = `${id}-${name}`
  const formDescriptionId = `${formItemId}-description`

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-[0.8rem] text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { id } = React.useContext(FormItemContext)
  const { name } = React.useContext(FormFieldContext)
  const { formState } = useFormContext()

  const error = formState.errors[name]
  const formItemId = `${id}-${name}`
  const formMessageId = `${formItemId}-message`

  const body = error ? String(error?.message) : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-[0.8rem] font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  useFormContext,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
}
