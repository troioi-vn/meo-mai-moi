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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function CategoriesPanel({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation('finance')
  const { data } = useCategories(ledger.id)
  const create = useCreateCategory(ledger.id)
  const update = useUpdateCategory(ledger.id)
  const archive = useArchiveCategory(ledger.id)
  const [name, setName] = useState('')
  const [applies, setApplies] = useState('expense')
  const [editingCategory, setEditingCategory] = useState<{
    id: number
    name: string
    appliesTo: string
  } | null>(null)
  const [editingName, setEditingName] = useState('')

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
          <Select value={applies} onValueChange={setApplies}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">{t('types.expense')}</SelectItem>
              <SelectItem value="income">{t('types.income')}</SelectItem>
              <SelectItem value="both">{t('types.both')}</SelectItem>
            </SelectContent>
          </Select>
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
                <Select
                  value={category.applies_to}
                  disabled={Boolean(category.archived_at)}
                  onValueChange={(value) => {
                    void update.mutateAsync({
                      categoryId: category.id,
                      body: { name: category.name, applies_to: value },
                    })
                  }}
                >
                  <SelectTrigger size="sm" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">{t('types.expense')}</SelectItem>
                    <SelectItem value="income">{t('types.income')}</SelectItem>
                    <SelectItem value="both">{t('types.both')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingCategory({
                      id: category.id,
                      name: category.name,
                      appliesTo: category.applies_to,
                    })
                    setEditingName(category.name)
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
      <Dialog
        open={editingCategory !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCategory(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('actions.edit')}</DialogTitle>
          </DialogHeader>
          <Input
            value={editingName}
            onChange={(event) => {
              setEditingName(event.target.value)
            }}
            aria-label={t('categories.name')}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingCategory(null)
              }}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              disabled={!editingName.trim() || update.isPending}
              onClick={() => {
                if (!editingCategory) return
                void update
                  .mutateAsync({
                    categoryId: editingCategory.id,
                    body: {
                      name: editingName.trim(),
                      applies_to: editingCategory.appliesTo,
                    },
                  })
                  .then(() => {
                    setEditingCategory(null)
                  })
              }}
            >
              {t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
