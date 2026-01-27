import type { AxiosRequestConfig } from 'axios'
import { api } from './axios'

/**
 * Custom mutator for Orval that uses the existing Axios instance 'api'.
 * Highlights:
 * - Uses the centralized 'api' instance (baseURL, 401 interceptors).
 * - Matches the runtime behavior where interceptors unwrap { data: T } -> T.
 */
/**
 * Custom mutator for Orval that uses the existing Axios instance 'api'.
 * Orval calls this with a single AxiosRequestConfig object.
 */
export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  return api(config) as Promise<T>
}

export type ErrorType<Error> = Error
