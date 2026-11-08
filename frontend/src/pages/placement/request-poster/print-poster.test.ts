import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test'
import { printPoster, type PosterPrintState } from './print-poster'

beforeEach(() => {
  vi.spyOn(window, 'print').mockImplementation(() => {})
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
})
afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function setup() {
  const sheet = document.createElement('article')
  const image = document.createElement('img')
  sheet.append(image)
  document.body.append(sheet)
  const state: PosterPrintState = { sheet, ready: true, revision: 'initial' }
  return { sheet, image, state }
}

it('retries a transient decode failure without marking the image as failed', async () => {
  const { image, state } = setup()
  let width = 0
  Object.defineProperty(image, 'naturalWidth', { get: () => width })
  const decode = vi
    .fn()
    .mockRejectedValueOnce(new Error('interrupted'))
    .mockImplementationOnce(() => {
      width = 1600
      return Promise.resolve()
    })
  image.decode = decode
  expect(await printPoster(() => state)).toBe(true)
  expect(decode).toHaveBeenCalledTimes(2)
  expect(window.print).toHaveBeenCalledOnce()
})
it('accepts loaded pixels when decode rejects', async () => {
  const { image, state } = setup()
  Object.defineProperties(image, { naturalWidth: { value: 1600 }, complete: { value: true } })
  const decode = vi.fn().mockRejectedValue(new Error('interrupted'))
  image.decode = decode
  expect(await printPoster(() => state)).toBe(true)
  expect(decode).toHaveBeenCalledOnce()
})
it('does not print missing pixels and allows another attempt', async () => {
  const { image, state } = setup()
  const decode = vi.fn().mockRejectedValue(new Error('not ready'))
  image.decode = decode
  expect(await printPoster(() => state)).toBe(false)
  expect(decode).toHaveBeenCalledTimes(2)
  expect(window.print).not.toHaveBeenCalled()
  expect(state.ready).toBe(true)
  Object.defineProperty(image, 'naturalWidth', { value: 1600 })
  image.decode = vi.fn().mockResolvedValue(undefined)
  expect(await printPoster(() => state)).toBe(true)
})
it.each(['detached', 'refetch', 'changed'] as const)(
  'does not print a sheet that becomes %s while awaiting decode',
  async (change) => {
    const { sheet, image, state } = setup()
    Object.defineProperty(image, 'naturalWidth', { value: 1600 })
    let finish: () => void = () => {}
    const decode = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    image.decode = decode
    const pending = printPoster(() => state)
    await vi.waitFor(() => {
      expect(decode).toHaveBeenCalledOnce()
    })
    if (change === 'detached') sheet.remove()
    if (change === 'refetch') state.ready = false
    if (change === 'changed') state.revision = 'new crop'
    finish()
    expect(await pending).toBe(false)
    expect(window.print).not.toHaveBeenCalled()
  }
)
it('does not print an absent or already-transient sheet', async () => {
  expect(await printPoster(() => null)).toBe(false)
  const { state } = setup()
  state.ready = false
  expect(await printPoster(() => state)).toBe(false)
  expect(window.print).not.toHaveBeenCalled()
})
