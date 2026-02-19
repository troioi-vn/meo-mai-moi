import { api } from '@/api/axios'

export interface CountryOption {
  code: string
  name: string
  phone_prefix: string | null
}

export const getCountries = async (): Promise<CountryOption[]> => {
  return api.get<CountryOption[]>('/countries')
}
