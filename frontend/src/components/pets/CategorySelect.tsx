import React, { useState, useEffect } from 'react'
import { CheckIcon, PlusIcon, Loader2, CircleHelp } from 'lucide-react'
import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsInput,
  TagsItem,
  TagsList,
  TagsTrigger,
  TagsValue,
} from '@/components/ui/shadcn-io/tags'
import { Badge } from '@/components/ui/badge'
import type { Category } from '@/types/pet'
import { postCategories as createCategory } from '@/api/generated/categories/categories'
import { useGetCategories } from '@/api/generated/categories/categories'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from '@/lib/i18n-toast'
import { useTranslation } from 'react-i18next'

interface Props {
  petTypeId: number | null
  selectedCategories: Category[]
  onChange: (categories: Category[]) => void
  maxCategories?: number
  disabled?: boolean
}

export const CategorySelect: React.FC<Props> = ({
  petTypeId,
  selectedCategories,
  onChange,
  maxCategories = 10,
  disabled = false,
}) => {
  const { t } = useTranslation(['pets', 'common'])
  const { data: categoriesResponse, isLoading: loading } = useGetCategories(
    { pet_type_id: petTypeId ?? 0 },
    { query: { enabled: !!petTypeId } }
  )
  const categories = (categoriesResponse ?? []) as Category[]

  const [searchValue, setSearchValue] = useState('')
  const [creating, setCreating] = useState(false)

  // Clear selected categories when pet type changes
  useEffect(() => {
    if (petTypeId && selectedCategories.length > 0) {
      // Filter out categories that don't match the new pet type
      const validCategories = selectedCategories.filter((c) => c.pet_type_id === petTypeId)
      if (validCategories.length !== selectedCategories.length) {
        onChange(validCategories)
      }
    }
  }, [petTypeId, selectedCategories, onChange])

  const handleSelect = (categoryId: string) => {
    const category = categories.find((c) => String(c.id) === categoryId)
    if (!category) return

    const isSelected = selectedCategories.some((c) => c.id === category.id)

    if (isSelected) {
      onChange(selectedCategories.filter((c) => c.id !== category.id))
    } else if (selectedCategories.length < maxCategories) {
      onChange([...selectedCategories, category])
    } else {
      toast.raw.error(t('pets:categories.limitError', { count: maxCategories }))
    }
  }

  const handleRemove = (categoryId: number) => {
    onChange(selectedCategories.filter((c) => c.id !== categoryId))
  }

  const handleCreateCategory = async () => {
    if (!petTypeId || !searchValue.trim() || creating) return

    setCreating(true)
    try {
      const newCategory = await createCategory({
        name: searchValue.trim(),
        pet_type_id: petTypeId,
      })

      // Select the new category
      if (selectedCategories.length < maxCategories) {
        onChange([...selectedCategories, newCategory])
      }
      setSearchValue('')
      toast.success('pets:categories.createSuccess')
    } catch (err: unknown) {
      console.error('Failed to create category:', err)
      toast.error('pets:categories.createError')
    } finally {
      setCreating(false)
    }
  }

  // Check if search value matches an existing category
  const exactMatch = categories.some(
    (c) => c.name.toLowerCase() === searchValue.toLowerCase().trim()
  )
  const canCreate = searchValue.trim().length > 0 && !exactMatch && petTypeId

  if (!petTypeId) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium">{t('pets:categories.label')}</label>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                <CircleHelp className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="text-sm" side="top">
              {t('pets:categories.helpText')}
            </PopoverContent>
          </Popover>
        </div>
        <div className="text-sm text-muted-foreground">
          {t('pets:categories.selectPetTypeFirst')}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium">
          {t('pets:categories.label')}{' '}
          <span className="text-muted-foreground font-normal">
            ({selectedCategories.length}/{maxCategories})
          </span>
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
              <CircleHelp className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="text-sm" side="top">
            {t('pets:categories.helpText')}
          </PopoverContent>
        </Popover>
      </div>

      <Tags className="w-full">
        <TagsTrigger disabled={disabled || selectedCategories.length >= maxCategories}>
          {selectedCategories.map((category) => (
            <TagsValue
              key={category.id}
              onRemove={() => {
                handleRemove(category.id)
              }}
            >
              {category.name}
              {!category.approved_at && (
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                  {t('pets:categories.pending')}
                </Badge>
              )}
            </TagsValue>
          ))}
        </TagsTrigger>
        <TagsContent>
          <TagsInput
            placeholder={
              loading ? t('common:actions.loading') : t('pets:categories.searchPlaceholder')
            }
            onValueChange={setSearchValue}
            disabled={loading}
          />
          <TagsList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                <TagsEmpty>
                  {canCreate ? (
                    <button
                      className="mx-auto flex cursor-pointer items-center gap-2 text-sm"
                      onClick={() => void handleCreateCategory()}
                      type="button"
                      disabled={creating}
                    >
                      {creating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlusIcon className="text-muted-foreground" size={14} />
                      )}
                      {t('pets:categories.createButton')} &quot;{searchValue.trim()}&quot;
                    </button>
                  ) : (
                    t('common:messages.noData')
                  )}
                </TagsEmpty>
                <TagsGroup>
                  {categories.map((category) => {
                    const isSelected = selectedCategories.some((c) => c.id === category.id)
                    return (
                      <TagsItem
                        key={category.id}
                        value={String(category.id)}
                        onSelect={handleSelect}
                      >
                        <div className="flex flex-col">
                          <span>{category.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!category.approved_at && (
                            <Badge variant="outline" className="text-xs">
                              {t('pets:categories.pending')}
                            </Badge>
                          )}
                          {isSelected && <CheckIcon className="text-muted-foreground" size={14} />}
                        </div>
                      </TagsItem>
                    )
                  })}
                </TagsGroup>
              </>
            )}
          </TagsList>
        </TagsContent>
      </Tags>
    </div>
  )
}
