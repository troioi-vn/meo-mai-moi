import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useTranslation } from 'react-i18next'

export function HelperProfileViewHeader({
  helperName,
  onEdit,
}: {
  helperName?: string
  onEdit: () => void
}) {
  const { t } = useTranslation(['common', 'helper'])

  return (
    <div className="px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">{t('common:nav.home')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/helper">{t('common:nav.helperProfiles')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{helperName ?? t('helper:view.helperFallback')}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button variant="ghost" size="default" onClick={onEdit} className="text-base">
          {t('common:actions.edit')}
        </Button>
      </div>
    </div>
  )
}
