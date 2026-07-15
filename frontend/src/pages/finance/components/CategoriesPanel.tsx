import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useArchiveCategory,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  type Ledger,
} from '@/api/finance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function CategoriesPanel({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation('finance')
  const { data } = useCategories(ledger.id)
  const create = useCreateCategory(ledger.id)
  const update = useUpdateCategory(ledger.id)
  const archive = useArchiveCategory(ledger.id)
  const [name, setName] = useState('')
  const [applies, setApplies] = useState('expense')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('areas.categories')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            className="max-w-sm"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
            placeholder={t('categories.name')}
          />
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={applies}
            onChange={(event) => {
              setApplies(event.target.value)
            }}
          >
            <option value="expense">{t('types.expense')}</option>
            <option value="income">{t('types.income')}</option>
            <option value="both">{t('types.both')}</option>
          </select>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              void create.mutateAsync({ name: name.trim(), applies_to: applies }).then(() => {
                setName('')
              })
            }}
          >
            {t('actions.add')}
          </Button>
        </div>
        <div className="space-y-2">
          {data?.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-3 rounded border p-3 text-sm"
            >
              <span className={category.archived_at ? 'text-muted-foreground line-through' : ''}>
                {category.name}
              </span>
              <div className="flex gap-2">
                <select
                  className="h-9 rounded-md border bg-background px-2"
                  value={category.applies_to}
                  disabled={Boolean(category.archived_at)}
                  onChange={(event) => {
                    void update.mutateAsync({
                      categoryId: category.id,
                      body: { name: category.name, applies_to: event.target.value },
                    })
                  }}
                >
                  <option value="expense">{t('types.expense')}</option>
                  <option value="income">{t('types.income')}</option>
                  <option value="both">{t('types.both')}</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = window.prompt(t('categories.name'), category.name)
                    if (next?.trim())
                      void update.mutateAsync({
                        categoryId: category.id,
                        body: { name: next.trim(), applies_to: category.applies_to },
                      })
                  }}
                >
                  {t('actions.edit')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void archive.mutateAsync(category.id)}
                >
                  {category.archived_at ? t('actions.restore') : t('actions.archive')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
