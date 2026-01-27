import { getCities as generatedGetCities, postCities } from './generated/cities/cities'
import type { City } from './generated/model/city'
import type { GetCitiesParams } from './generated/model/getCitiesParams'

export type ListCitiesParams = GetCitiesParams

export const getCities = async (params: ListCitiesParams): Promise<City[]> => {
  return generatedGetCities(params)
}

export const createCity = async (payload: {
  name: string
  country: string
  description?: string
}): Promise<City> => {
  return postCities(payload)
}
