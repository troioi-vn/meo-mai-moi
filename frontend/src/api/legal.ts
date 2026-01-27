import { getLegalPlacementTerms as generatedGetLegalPlacementTerms } from './generated/legal/legal'

export interface PlacementTerms {
  content: string
  version: string
}

/**
 * Get the placement terms and conditions document
 */
export const getPlacementTerms = async (): Promise<PlacementTerms> => {
  const data = await generatedGetLegalPlacementTerms()
  return data as unknown as PlacementTerms
}
