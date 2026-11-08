import { afterEach, describe, expect, it } from 'vite-plus/test'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'
import i18n from '@/i18n'
import { api, authApi } from './axios'

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('explicit request language', () => {
  it('preserves the poster language and defaults ordinary API and auth requests to the UI language', async () => {
    await i18n.changeLanguage('ru')
    server.use(
      http.get('http://localhost:3000/api/poster-language-test', ({ request }) =>
        HttpResponse.json({ data: request.headers.get('Accept-Language') })
      )
    )
    server.use(
      http.get('http://localhost:3000/poster-language-test', ({ request }) =>
        HttpResponse.json({ data: request.headers.get('Accept-Language') })
      )
    )
    expect(await api.get('/poster-language-test', { headers: { 'accept-language': 'vi' } })).toBe(
      'vi'
    )
    expect(await api.get('/poster-language-test')).toBe('ru')
    expect(
      await authApi.get('/poster-language-test', { headers: { 'Accept-Language': 'uk' } })
    ).toBe('uk')
    expect(await authApi.get('/poster-language-test')).toBe('ru')
  })
})
