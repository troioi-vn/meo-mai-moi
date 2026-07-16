import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon, Paperclip, Send } from 'lucide-react'
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { imageFilesFromClipboardData, useMediaUpload } from '@/hooks/use-media-upload'
import { useFileDrop } from '@/hooks/use-file-drop'
import { cn } from '@/lib/utils'

interface MessageComposerProps {
  onSend: (content: string) => Promise<void>
  onSendImage?: (file: File) => Promise<void>
  imageUploadProgress?: number | null
  disabled?: boolean
  placeholder?: string
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  onSendImage,
  imageUploadProgress = null,
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
      setContent(messageContent)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      className={cn(
        'relative flex flex-col gap-2 p-4 transition-colors',
        isDragging && 'bg-primary/5 ring-2 ring-inset ring-primary/30'
      )}
      {...dropProps}
    >
      {imageUploadProgress !== null && (
        <Attachment state="uploading" className="w-full max-w-sm">
          <AttachmentMedia>
            <Spinner />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{t('messaging.sendImage')}</AttachmentTitle>
            <AttachmentDescription>{Math.round(imageUploadProgress)}%</AttachmentDescription>
            <Progress value={imageUploadProgress} className="mt-2 h-1.5" />
          </AttachmentContent>
        </Attachment>
      )}

      {onSendImage && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFileChange(e)
          }}
        />
      )}

      <InputGroup className="h-auto items-end">
        <InputGroupTextarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={resolvedPlaceholder}
          disabled={disabled}
          className="min-h-11 max-h-30"
          rows={1}
        />
        <InputGroupAddon align="block-end" className="justify-between">
          {onSendImage ? (
            <InputGroupButton
              type="button"
              size="icon-sm"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              aria-label={t('messaging.sendImage')}
            >
              <Paperclip />
            </InputGroupButton>
          ) : (
            <span />
          )}
          <InputGroupButton
            type="submit"
            variant="default"
            size="icon-sm"
            disabled={disabled || !content.trim()}
            className="ml-auto"
            aria-label={t('messaging.sendMessage')}
          >
            <Send />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-md bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow-sm">
            <ImageIcon className="size-4" />
            {t('messaging.sendImage')}
          </div>
        </div>
      )}
    </form>
  )
}
