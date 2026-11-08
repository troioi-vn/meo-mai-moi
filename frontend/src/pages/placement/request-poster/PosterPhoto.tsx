import { useRef, type PointerEvent } from 'react'
import { dragFocus } from './poster-settings'

interface Props {
  url: string
  name: string
  label: string
  focus: [number, number]
  onChange: (focus: [number, number]) => void
  onError: () => void
  onLoad: () => void
}

export function PosterPhoto({ url, name, label, focus, onChange, onError, onLoad }: Props) {
  const image = useRef<HTMLImageElement>(null)
  const drag = useRef<{ x: number; y: number; focus: [number, number] } | null>(null)
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current
    const img = image.current
    if (!start || !img?.naturalWidth) return
    const frame = event.currentTarget.getBoundingClientRect()
    onChange(
      dragFocus(
        start.focus,
        [event.clientX - start.x, event.clientY - start.y],
        [frame.width, frame.height],
        [img.naturalWidth, img.naturalHeight]
      )
    )
  }
  return (
    <div
      className="poster-photo"
      role="group"
      aria-label={label}
      tabIndex={0}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return
        drag.current = { x: event.clientX, y: event.clientY, focus }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={move}
      onPointerUp={(event) => {
        move(event)
        drag.current = null
      }}
      onPointerCancel={() => {
        drag.current = null
      }}
      onLostPointerCapture={() => {
        drag.current = null
      }}
      onKeyDown={(event) => {
        const directions: Record<string, [number, number]> = {
          ArrowLeft: [-2, 0],
          ArrowRight: [2, 0],
          ArrowUp: [0, -2],
          ArrowDown: [0, 2],
        }
        const delta = directions[event.key]
        if (!delta) return
        event.preventDefault()
        onChange([
          Math.max(0, Math.min(100, focus[0] + delta[0])),
          Math.max(0, Math.min(100, focus[1] + delta[1])),
        ])
      }}
    >
      <img
        ref={image}
        src={url}
        alt={name}
        draggable={false}
        onError={onError}
        onLoad={onLoad}
        style={{ objectPosition: `${String(focus[0])}% ${String(focus[1])}%` }}
      />
    </div>
  )
}
