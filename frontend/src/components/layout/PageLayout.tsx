import { Fragment, type ComponentProps, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'

type PageWidth = 'compact' | 'narrow' | 'default' | 'wide' | 'full'

const pageWidthClasses: Record<PageWidth, string> = {
  compact: 'max-w-2xl',
  narrow: 'max-w-4xl',
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
  full: '',
}

interface PageContainerProps extends ComponentProps<'div'> {
  width?: PageWidth
}

export function PageContainer({ width = 'default', className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn('container mx-auto px-4 py-8', pageWidthClasses[width], className)}
      {...props}
    />
  )
}

interface PageHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  headingClassName?: string
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  headingClassName,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}
      {...props}
    >
      <div className="min-w-0">
        <h1 className={cn('text-2xl font-bold tracking-tight text-foreground', headingClassName)}>
          {title}
        </h1>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

interface AppBreadcrumbItem {
  label: ReactNode
  to?: string
}

interface AppBreadcrumbsProps extends ComponentProps<typeof Breadcrumb> {
  items: AppBreadcrumbItem[]
}

export function AppBreadcrumbs({ items, className, ...props }: AppBreadcrumbsProps) {
  return (
    <Breadcrumb className={cn('mb-6', className)} {...props}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1

          return (
            <Fragment key={`${index}-${item.to ?? ''}`}>
              <BreadcrumbItem>
                {item.to && !isCurrent ? (
                  <BreadcrumbLink asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isCurrent && <BreadcrumbSeparator />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
