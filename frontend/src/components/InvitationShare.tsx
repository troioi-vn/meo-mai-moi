import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Share2, Copy, Mail, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

interface InvitationShareProps {
  invitationUrl: string
  invitationCode: string
}

const InvitationShare: React.FC<InvitationShareProps> = ({ invitationUrl, invitationCode }) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl)
      toast.success('Invitation link copied!')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleCopyMessage = async () => {
    const message = `Hi! I'd like to invite you to join our platform. Click this link to register: ${invitationUrl}`
    try {
      await navigator.clipboard.writeText(message)
      toast.success('Message copied!')
    } catch {
      toast.error('Failed to copy message')
    }
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent("You're invited to join our platform!")
    const body = encodeURIComponent(`Hi there!\n\nI'd like to invite you to join our platform. Click the link below to create your account:\n\n${invitationUrl}\n\nLooking forward to seeing you there!`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const handleSMSShare = () => {
    const message = encodeURIComponent(`Hi! I'd like to invite you to join our platform: ${invitationUrl}`)
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
          <DialogTitle>Share Invitation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Invitation URL */}
          <div className="space-y-2">
            <Label htmlFor="invitation-url">Invitation Link</Label>
            <div className="flex gap-2">
              <Input
                id="invitation-url"
                value={invitationUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" size="sm" onClick={() => { void handleCopyUrl() }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Pre-written message */}
          <div className="space-y-2">
            <Label htmlFor="invitation-message">Ready-to-send Message</Label>
            <div className="space-y-2">
              <Textarea
                id="invitation-message"
                value={`Hi! I'd like to invite you to join our platform. Click this link to register: ${invitationUrl}`}
                readOnly
                rows={3}
                className="text-sm"
              />
              <Button variant="outline" size="sm" onClick={() => { void handleCopyMessage() }} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copy Message
              </Button>
            </div>
          </div>

          {/* Share options */}
          <div className="space-y-2">
            <Label>Quick Share</Label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEmailShare} className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button variant="outline" onClick={handleSMSShare} className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS
              </Button>
            </div>
          </div>

          {/* Invitation code */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Invitation Code</p>
            <p className="font-mono text-sm">{invitationCode}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InvitationShare