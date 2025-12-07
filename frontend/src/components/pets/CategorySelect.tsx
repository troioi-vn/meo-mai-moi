import React, { useState, useEffect, useCallback } from 'react'
import { CheckIcon, PlusIcon, Loader2 } from 'lucide-react'
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
import { getCategories, createCategory } from '@/api/categories'
import { toast } from 'sonner'

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
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [creating, setCreating] = useState(false)

  // Load categories when pet type changes
  const loadCategories = useCallback(async () => {
    if (!petTypeId) {
      setCategories([])
      return
    }

    setLoading(true)
    try {
      const result = await getCategories({ pet_type_id: petTypeId })
      setCategories(result)
    } catch (err) {
      console.error('Failed to load categories:', err)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [petTypeId])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

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
      toast.error(`Maximum ${String(maxCategories)} categories allowed`)
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

      // Add to categories list and select it
      setCategories((prev) => [...prev, newCategory])
      if (selectedCategories.length < maxCategories) {
        onChange([...selectedCategories, newCategory])
      }
      setSearchValue('')
      toast.success('Category created')
    } catch (err) {
      console.error('Failed to create category:', err)
      toast.error('Failed to create category')
    } finally {
      setCreating(false)
    }
  }

  // Check if search value matches an existing category
  const exactMatch = categories.some(
    (c) => c.name.toLowerCase() === searchValue.toLowerCase().trim()
  )
  const canCreate = searchValue.trim().length > 0 && !exactMatch && petTypeId && !creating

  if (!petTypeId) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Categories</label>
        <div className="text-sm text-muted-foreground">
          Select a pet type first to add categories
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        Categories{' '}
        <span className="text-muted-foreground font-normal">
          ({selectedCategories.length}/{maxCategories})
        </span>
      </label>

      <Tags className="w-full">
        <TagsTrigger disabled={disabled || selectedCategories.length >= maxCategories}>
          {selectedCategories.map((category) => (
            <TagsValue key={category.id} onRemove={() => { handleRemove(category.id); }}>
              {category.name}
              {!category.approved_at && (
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                  Pending
                </Badge>
              )}
            </TagsValue>
          ))}
        </TagsTrigger>
        <TagsContent>
          <TagsInput
            placeholder={loading ? 'Loading...' : 'Search categories...'}
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
                      Create: "{searchValue.trim()}"
                    </button>
                  ) : (
                    'No categories found.'
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
                              Pending
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
