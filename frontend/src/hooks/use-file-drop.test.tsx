import type React from 'react'
import { fireEvent, render, screen } from '@/testing'
import { describe, expect, it, vi } from 'vite-plus/test'
import { useFileDrop } from './use-file-drop'

function DropTarget({
  onFiles,
  multiple,
  disabled,
}: {
  onFiles: (files: File[]) => void
  multiple?: boolean
  disabled?: boolean
}) {
  const { isDragging, dropProps } = useFileDrop({ onFiles, multiple, disabled })

  return (
    <div data-testid="drop-target" data-dragging={String(isDragging)} {...dropProps}>
      Drop
    </div>
  )
}

const imageFile = new File(['image'], 'photo.jpg', { type: 'image/jpeg' })
const secondImageFile = new File(['image'], 'second.png', { type: 'image/png' })
const textFile = new File(['text'], 'note.txt', { type: 'text/plain' })

const dataTransfer = (files: File[]) =>
  ({
    files,
    types: ['Files'],
    dropEffect: 'none',
  }) as unknown as React.DragEvent<HTMLElement>['dataTransfer']

describe('useFileDrop', () => {
  it('highlights while dragging files and returns image files on drop', () => {
    const onFiles = vi.fn()
    render(<DropTarget onFiles={onFiles} />)
    const target = screen.getByTestId('drop-target')

    fireEvent.dragEnter(target, { dataTransfer: dataTransfer([imageFile]) })
    expect(target).toHaveAttribute('data-dragging', 'true')

    fireEvent.drop(target, { dataTransfer: dataTransfer([imageFile]) })

    expect(onFiles).toHaveBeenCalledWith([imageFile])
    expect(target).toHaveAttribute('data-dragging', 'false')
  })

  it('filters non-images and limits to one file by default', () => {
    const onFiles = vi.fn()
    render(<DropTarget onFiles={onFiles} />)

    fireEvent.drop(screen.getByTestId('drop-target'), {
      dataTransfer: dataTransfer([textFile, imageFile, secondImageFile]),
    })

    expect(onFiles).toHaveBeenCalledWith([imageFile])
  })

  it('allows multiple image files when requested', () => {
    const onFiles = vi.fn()
    render(<DropTarget onFiles={onFiles} multiple />)

    fireEvent.drop(screen.getByTestId('drop-target'), {
      dataTransfer: dataTransfer([imageFile, secondImageFile]),
    })

    expect(onFiles).toHaveBeenCalledWith([imageFile, secondImageFile])
  })

  it('ignores drops when disabled', () => {
    const onFiles = vi.fn()
    render(<DropTarget onFiles={onFiles} disabled />)

    fireEvent.drop(screen.getByTestId('drop-target'), {
      dataTransfer: dataTransfer([imageFile]),
    })

    expect(onFiles).not.toHaveBeenCalled()
  })
})
