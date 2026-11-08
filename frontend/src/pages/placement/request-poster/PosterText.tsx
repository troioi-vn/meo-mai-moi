import { useLayoutEffect, useRef } from 'react'

/** Fit in physical units before the preview is scaled. Request wording yields first. */
export function PosterHeadline({ name, text }: { name: string; text: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const lifecycle = new AbortController()
    const fit = () => {
      if (lifecycle.signal.aborted) return
      element.textContent = text
      element.style.whiteSpace = 'normal'
      element.style.fontSize = '30pt'
      if (!element.clientHeight) return
      // max-height lets short headlines collapse. Compare against the ceiling,
      // not the changing natural height while trying progressively smaller text.
      const ceiling = parseFloat(getComputedStyle(element).maxHeight)
      const heightBudget = Number.isFinite(ceiling) ? Math.ceil(ceiling) : element.clientHeight
      const overflows = () =>
        element.scrollHeight > heightBudget || element.scrollWidth > element.clientWidth
      while (overflows() && parseFloat(element.style.fontSize) > 24) {
        element.style.fontSize = `${String(parseFloat(element.style.fontSize) - 1)}pt`
      }
      if (!overflows()) return
      const index = text.indexOf(name)
      const rest =
        index < 0 ? text : `${text.slice(0, index)}${text.slice(index + name.length)}`.trim()
      element.style.whiteSpace = 'pre-line'
      element.textContent = `${name}\n${rest}`
      if (!overflows()) return
      // Give the name all the space it needs before shortening it. With an
      // extreme name the wording disappears first, then the name ellipsizes.
      for (let length = rest.length - 1; length >= 0; length--) {
        element.textContent = length === 0 ? name : `${name}\n${rest.slice(0, length).trimEnd()}…`
        if (!overflows()) return
      }
      let low = 0
      let high = name.length
      while (low < high) {
        const mid = Math.ceil((low + high) / 2)
        element.textContent = `${name.slice(0, mid).trimEnd()}…`
        if (overflows()) high = mid - 1
        else low = mid
      }
      element.textContent = `${name.slice(0, low).trimEnd()}…`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    if ('fonts' in document) void document.fonts.ready.then(fit)
    return () => {
      lifecycle.abort()
      observer.disconnect()
    }
  }, [name, text])
  return (
    <h1 ref={ref} className="poster-headline" title={text} aria-label={text}>
      {text}
    </h1>
  )
}

export function PosterNotes({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const lifecycle = new AbortController()
    const fit = () => {
      if (lifecycle.signal.aborted) return
      element.textContent = text
      if (element.clientHeight === 0) return
      let low = 0
      let high = text.length
      if (element.scrollHeight <= element.clientHeight) return
      while (low < high) {
        const mid = Math.ceil((low + high) / 2)
        element.textContent = `${text.slice(0, mid).trimEnd()}…`
        if (element.scrollHeight <= element.clientHeight) low = mid
        else high = mid - 1
      }
      element.textContent = low === 0 ? '' : `${text.slice(0, low).trimEnd()}…`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    if ('fonts' in document) void document.fonts.ready.then(fit)
    return () => {
      lifecycle.abort()
      observer.disconnect()
    }
  }, [text])
  return (
    <p ref={ref} className="poster-notes" title={text}>
      {text}
    </p>
  )
}
