import type React from 'react'

export function FormSectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType
  title: string
}) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b mb-4">
      <Icon className="h-5 w-5 text-primary" />
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
  )
}
