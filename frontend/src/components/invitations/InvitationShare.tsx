import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Share2, Copy, Mail, MessageSquare } from 'lucide-react'
import { toast } from '@/lib/i18n-toast'
import { useState } from 'react'

interface InvitationShareProps {
  invitationUrl: string
  invitationCode: string
}

const InvitationShare: React.FC<InvitationShareProps> = ({ invitationUrl, invitationCode }) => {
  const { t } = useTranslation('resourceInvitations')
  const [isOpen, setIsOpen] = useState(false)

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl)
      toast.success('common:messages.copied')
    } catch {
      toast.error('common:messages.copyFailed')
    }
  }

  const handleCopyMessage = async () => {
    const message = t('share.message', { url: invitationUrl })
    try {
      await navigator.clipboard.writeText(message)
      toast.success('common:messages.copied')
    } catch {
      toast.error('common:messages.copyFailed')
    }
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent(t('share.subject'))
    const body = encodeURIComponent(t('share.body', { url: invitationUrl }))
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const handleSMSShare = () => {
    const message = encodeURIComponent(t('share.smsMessage', { url: invitationUrl }))
    window.open(`sms:?body=${message}`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Share invitation">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('share.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Invitation URL */}
          <div className="space-y-2">
            <Label htmlFor="invitation-url">{t('share.link')}</Label>
            <div className="flex gap-2">
              <Input
                id="invitation-url"
                value={invitationUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleCopyUrl()
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Pre-written message */}
          <div className="space-y-2">
            <Label htmlFor="invitation-message">{t('share.readyMessage')}</Label>
            <div className="space-y-2">
              <Textarea
                id="invitation-message"
                value={t('share.message', { url: invitationUrl })}
                readOnly
                rows={3}
                className="text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleCopyMessage()
                }}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                {t('share.copyMessage')}
              </Button>
            </div>
          </div>

          {/* Share options */}
          <div className="space-y-2">
            <Label>{t('share.quickShare')}</Label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEmailShare} className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                {t('share.email')}
              </Button>
              <Button variant="outline" onClick={handleSMSShare} className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('share.sms')}
              </Button>
            </div>
          </div>

          {/* Invitation code */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{t('share.code')}</p>
            <p className="font-mono text-sm">{invitationCode}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InvitationShare
