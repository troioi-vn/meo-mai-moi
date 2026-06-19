import { useRef, useState } from 'react'
import type React from 'react'
import { ACCEPTED_IMAGE_MIME } from '@/lib/media-validation'

interface UseFileDropOptions {
  onFiles: (files: File[]) => void
  accept?: readonly string[]
  disabled?: boolean
  multiple?: boolean
}

const hasFiles = (event: React.DragEvent<HTMLElement>) =>
  Array.from(event.dataTransfer.types).includes('Files')

const filterFiles = (files: File[], accept: readonly string[], multiple: boolean) => {
  const acceptedFiles = files.filter((file) => accept.includes(file.type))
  return multiple ? acceptedFiles : acceptedFiles.slice(0, 1)
}

export function useFileDrop({
  onFiles,
  accept = ACCEPTED_IMAGE_MIME,
  disabled = false,
  multiple = false,
}: UseFileDropOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const dragDepthRef = useRef(0)

  const resetDrag = () => {
    dragDepthRef.current = 0
    setIsDragging(false)
  }

  const handleDragEnter = (event: React.DragEvent<HTMLElement>) => {
    if (disabled || !hasFiles(event)) return

    event.preventDefault()
    dragDepthRef.current += 1
    setIsDragging(true)
  }

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (disabled || !hasFiles(event)) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLElement>) => {
    if (disabled || !hasFiles(event)) return

    event.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    if (disabled || !hasFiles(event)) return

    event.preventDefault()
    const files = filterFiles(Array.from(event.dataTransfer.files), accept, multiple)
    resetDrag()

    if (files.length > 0) {
      onFiles(files)
    }
  }

  return {
    isDragging,
    dropProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  }
}
