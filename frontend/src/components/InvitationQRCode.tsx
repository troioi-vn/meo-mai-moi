import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { QrCode, Download } from 'lucide-react'
import { toast } from 'sonner'

interface InvitationQRCodeProps {
  invitationUrl: string
  invitationCode: string
}

const InvitationQRCode: React.FC<InvitationQRCodeProps> = ({ invitationUrl, invitationCode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !invitationUrl) {
      return
    }

    // Use requestAnimationFrame to ensure DOM is painted
    const rafId = requestAnimationFrame(() => {
      if (!canvasRef.current) {
        return
      }

      setIsLoading(true)
      setError(null)
      
      const canvas = canvasRef.current
      
      // Clear the canvas first
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      
      // Generate QR code
      QRCode.toCanvas(canvas, invitationUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
      .then(() => {
        setIsLoading(false)
      })
      .catch((error: unknown) => {
        console.error('Failed to generate QR code:', error)
        setError('Failed to generate QR code')
        setIsLoading(false)
        toast.error('Failed to generate QR code')
      })
    })

    return () => { cancelAnimationFrame(rafId); }
  }, [invitationUrl, isOpen])

  const handleDownload = () => {
    if (canvasRef.current) {
      try {
        const link = document.createElement('a')
        link.download = `invitation-${invitationCode.slice(0, 8)}.png`
        link.href = canvasRef.current.toDataURL('image/png')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('QR code downloaded!')
      } catch (error) {
        console.error('Failed to download QR code:', error)
        toast.error('Failed to download QR code')
      }
    } else {
      toast.error('QR code not ready for download')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitation QR Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative w-64 h-64">
              <canvas 
                ref={canvasRef} 
                className="border rounded-lg"
                role="img" 
                aria-label="Invitation QR Code"
                width={256}
                height={256}
                style={{ display: 'block' }}
              />
              {isLoading && (
                <div className="absolute inset-0 border rounded-lg flex items-center justify-center bg-background z-10">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="text-sm text-muted-foreground">Generating QR code...</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 border rounded-lg flex items-center justify-center bg-background z-10">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-red-600">{error}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setError(null)
                        setIsOpen(false)
                        setTimeout(() => {
                          setIsOpen(true)
                        }, 100)
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Share this QR code for easy access to your invitation
            </p>
            <p className="text-xs font-mono bg-muted p-2 rounded">
              {invitationCode}
            </p>
            <p className="text-xs text-muted-foreground break-all">
              {invitationUrl}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleDownload} 
              className="flex-1"
              disabled={isLoading || !!error}
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InvitationQRCode