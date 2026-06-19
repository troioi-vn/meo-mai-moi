import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { imageFilesFromClipboardData, useMediaUpload } from '@/hooks/use-media-upload'
import { useFileDrop } from '@/hooks/use-file-drop'

interface MessageComposerProps {
  onSend: (content: string) => Promise<void>
  onSendImage?: (file: File) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  onSendImage,
  disabled = false,
  placeholder,
}) => {
  const { t } = useTranslation('common')
  const resolvedPlaceholder = placeholder ?? t('messaging.typePlaceholder')
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resetUploadRef = useRef<(() => void) | null>(null)
  const mediaUpload = useMediaUpload({
    limitKey: 'chatImage',
    mode: 'deferred',
    onSelectDeferred: (files) => {
      const file = files[0]
      if (!file || !onSendImage) return

      void onSendImage(file).finally(() => {
        resetUploadRef.current?.()
      })
    },
  })
  resetUploadRef.current = mediaUpload.reset
  const { isDragging, dropProps } = useFileDrop({
    onFiles: mediaUpload.selectFiles,
    disabled: disabled || !onSendImage,
  })

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${String(Math.min(textarea.scrollHeight, 120))}px`
    }
  }, [content])

  const handleSubmit = async () => {
    if (!content.trim() || disabled) return

    const messageContent = content
    setContent('')

    try {
      await onSend(messageContent)
    } catch {
      // Restore content on error
      setContent(messageContent)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onSendImage) {
      mediaUpload.selectFiles([file])
    }

    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled || !onSendImage) return

    const files = imageFilesFromClipboardData(event.clipboardData)
    if (files.length === 0) return

    event.preventDefault()
    mediaUpload.selectFiles(files.slice(0, 1))
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit()
      }}
      className={`flex items-end gap-2 p-4 transition-colors ${
        isDragging ? 'bg-primary/5 ring-2 ring-inset ring-primary/30' : ''
      }`}
      {...dropProps}
    >
      {onSendImage && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleFileChange(e)
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="h-11 w-11 shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">{t('messaging.sendImage')}</span>
          </Button>
        </>
      )}
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={resolvedPlaceholder}
        disabled={disabled}
        className="min-h-11 max-h-30 resize-none"
        rows={1}
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !content.trim()}
        className="h-11 w-11 shrink-0"
      >
        <Send className="h-5 w-5" />
        <span className="sr-only">{t('messaging.sendMessage')}</span>
      </Button>
    </form>
  )
}
