import { api } from './axios'

export interface PlacementTerms {
  content: string
  version: string
}

/**
 * Get the placement terms and conditions document
 */
export const getPlacementTerms = async (): Promise<PlacementTerms> => {
  const { data } = await api.get<{ data: PlacementTerms }>('/legal/placement-terms')
  return data.data
}
