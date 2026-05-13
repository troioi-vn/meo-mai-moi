import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { AxiosResponse } from 'axios'
import { api, setVersionMismatchHandler } from './axios'

interface ResponseInterceptorHandler {
  fulfilled?: (value: AxiosResponse<unknown>) => unknown
}

const getFirstResponseInterceptor = (): ((value: AxiosResponse<unknown>) => unknown) => {
  const interceptorManager = api.interceptors.response as unknown as {
    handlers: ResponseInterceptorHandler[]
  }

  const fulfilled = interceptorManager.handlers[0]?.fulfilled
  if (!fulfilled) {
    throw new Error('Response interceptor not registered')
  }

  return fulfilled
}

const createResponse = (version: string): AxiosResponse<unknown> =>
  ({
    data: { data: null },
    status: 200,
    statusText: 'OK',
    headers: { 'x-app-version': version },
    config: {
      headers: {
        Accept: 'application/json',
      },
    },
  }) as unknown as AxiosResponse<unknown>

describe('axios app version detection', () => {
  beforeEach(() => {
    setVersionMismatchHandler(null)
  })

  it('notifies only once for the same new app version', () => {
    const onMismatch = vi.fn()
    setVersionMismatchHandler(onMismatch)

    const handleResponse = getFirstResponseInterceptor()

    handleResponse(createResponse('v-test-initial'))
    handleResponse(createResponse('v-test-next'))
    handleResponse(createResponse('v-test-next'))

    expect(onMismatch).toHaveBeenCalledTimes(1)
  })
})
