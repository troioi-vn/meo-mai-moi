import { afterEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { AxiosError } from 'axios'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import * as axiosModule from './axios'

describe('api csrf retry interceptor', () => {
  const originalAdapter = axiosModule.api.defaults.adapter

  afterEach(() => {
    axiosModule.api.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('re-primes csrf once and retries the original request after a 419', async () => {
    const csrfSpy = vi.spyOn(axios, 'get').mockResolvedValue({} as never)
    let requestCount = 0

    const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
      requestCount += 1

      if (requestCount === 1) {
        return Promise.reject(
          new AxiosError('Page Expired', 'ERR_BAD_REQUEST', config, undefined, {
            data: { message: 'Page expired' },
            status: 419,
            statusText: 'Page Expired',
            headers: {},
            config,
          })
        )
      }

      return {
        data: { data: { ok: true } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } satisfies AxiosResponse
    }

    axiosModule.api.defaults.adapter = adapter

    await expect(axiosModule.api.get('/pets')).resolves.toEqual({ ok: true })
    expect(csrfSpy).toHaveBeenCalledTimes(1)
    expect(requestCount).toBe(2)
  })
})
