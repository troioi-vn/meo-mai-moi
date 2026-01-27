import { api } from './axios'

export interface PlacementTerms {
  content: string
  version: string
}

/**
 * Get the placement terms and conditions document
 */
export const getPlacementTerms = async (): Promise<PlacementTerms> => {
  return await api.get<PlacementTerms>('/legal/placement-terms')
}
