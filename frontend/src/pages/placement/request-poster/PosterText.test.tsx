import { afterEach, expect, it, vi } from 'vite-plus/test'
import { render, screen } from '@testing-library/react'
import { PosterHeadline } from './PosterText'

afterEach(() => {
  vi.restoreAllMocks()
})

function maxHeightLayout() {
  const naturalHeight = (element: HTMLElement) => {
    const font = parseFloat(element.style.fontSize || '30')
    const perLine = Math.floor(680 / (font * 0.8))
    return (
      ((element.textContent
        .split('\n')
        .reduce((lines, text) => lines + Math.ceil(text.length / perLine), 0) *
        font *
        96) /
        72) *
      1.12
    )
  }
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(680)
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(680)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return Math.round(Math.min(90.7, naturalHeight(this)))
  })
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return Math.round(naturalHeight(this))
  })
  const computed = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    const style = computed(element)
    Object.defineProperty(style, 'maxHeight', { value: '90.7px' })
    return style
  })
}

it('keeps a one-line headline at 30pt without reserving the maximum height', () => {
  maxHeightLayout()
  render(<PosterHeadline name="Minnie" text="Minnie needs a home" />)
  const headline = screen.getByRole('heading')
  expect(headline).toHaveTextContent('Minnie needs a home')
  expect(headline.style.fontSize).toBe('30pt')
  expect(headline.style.height).toBe('')
  expect(headline.clientHeight).toBeLessThan(91)
})
it('fits against the max-height ceiling at no less than 24pt, preserving the name first', () => {
  maxHeightLayout()
  const name = 'Minnie the wonderful cat'
  render(
    <PosterHeadline
      name={name}
      text={`${name} needs a very long description of a wonderful foster home`}
    />
  )
  const headline = screen.getByRole('heading')
  expect(parseFloat(headline.style.fontSize)).toBeGreaterThanOrEqual(24)
  expect(headline.scrollHeight).toBeLessThanOrEqual(91)
  expect(headline.textContent).toContain(name)
  expect(headline.style.height).toBe('')
})
