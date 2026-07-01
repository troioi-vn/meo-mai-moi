import { describe, expect, it } from 'vite-plus/test'
import { getGetCategoriesQueryKey } from '@/api/generated/categories/categories'
import { getGetPetTypesQueryKey } from '@/api/generated/pet-types/pet-types'
import {
  getGetMyPetsQueryKey,
  getGetMyPetsSectionsQueryKey,
  getGetPetsFeaturedQueryKey,
} from '@/api/generated/pets/pets'
import { persistOptions, shouldPersistQueryKey } from './query-cache'

describe('query cache persistence allowlist', () => {
  it('persists authenticated my-pets queries', () => {
    expect(shouldPersistQueryKey(getGetMyPetsQueryKey())).toBe(true)
    expect(shouldPersistQueryKey(getGetMyPetsSectionsQueryKey())).toBe(true)
  })

  it('persists public taxonomy and featured pet reads', () => {
    expect(shouldPersistQueryKey(getGetPetTypesQueryKey())).toBe(true)
    expect(shouldPersistQueryKey(getGetCategoriesQueryKey())).toBe(true)
    expect(shouldPersistQueryKey(getGetPetsFeaturedQueryKey())).toBe(true)
  })

  it('persists pet detail queries under the /pets/ prefix', () => {
    expect(shouldPersistQueryKey(['/pets'])).toBe(true)
    expect(shouldPersistQueryKey(['/pets/42'])).toBe(true)
    expect(shouldPersistQueryKey(['/pets/42/weights'])).toBe(true)
  })

  it('does not persist unrelated authenticated queries', () => {
    expect(shouldPersistQueryKey(['/pets-archive'])).toBe(false)
    expect(shouldPersistQueryKey(['/users/me'])).toBe(false)
    expect(shouldPersistQueryKey(['/messages'])).toBe(false)
    expect(shouldPersistQueryKey(['/placement-requests'])).toBe(false)
    expect(shouldPersistQueryKey(['/habits'])).toBe(false)
  })

  it('does not persist TanStack Query mutations', () => {
    const shouldDehydrateMutation = persistOptions.dehydrateOptions?.shouldDehydrateMutation
    expect(shouldDehydrateMutation?.({} as never)).toBe(false)
  })
})
