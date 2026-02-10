import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

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

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${String(Math.min(textarea.scrollHeight, 120))}px`
    }
  }, [content])

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
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
      void handleSubmit(e)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onSendImage) return

    if (file.size > MAX_IMAGE_SIZE) {
      alert(t('messaging.imageTooLarge'))
      return
    }

    try {
      await onSendImage(file)
    } catch {
      // Error handled in hook
    }

    // Reset input so same file can be selected again
    e.target.value = ''
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e)
      }}
      className="flex items-end gap-2 p-4"
    >
      {onSendImage && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void handleFileChange(e)
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
