import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  getUserInvitations, 
  generateInvitation, 
  revokeInvitation, 
  getInvitationStats,
  type Invitation, 
  type InvitationStats 
} from '@/api/invite-system'
import { 
  Plus, 
  Copy, 
  Trash2, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  Mail,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import InvitationQRCode from '@/components/InvitationQRCode'
import InvitationShare from '@/components/InvitationShare'

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [stats, setStats] = useState<InvitationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [invitationsData, statsData] = await Promise.all([
        getUserInvitations(),
        getInvitationStats()
      ])
      setInvitations(invitationsData)
      setStats(statsData)
    } catch (err) {
      console.error('Failed to load invitations:', err)
      setError('Failed to load invitations. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleGenerateInvitation = async () => {
    try {
      setIsGenerating(true)
      const newInvitation = await generateInvitation()
      setInvitations(prev => [newInvitation, ...prev])
      setStats(prev => prev ? { ...prev, total: prev.total + 1, pending: prev.pending + 1 } : null)
      toast.success('Invitation generated successfully!')
    } catch (err) {
      console.error('Failed to generate invitation:', err)
      toast.error('Failed to generate invitation. You may have reached your daily limit.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyInvitation = async (invitation: Invitation) => {
    try {
      await navigator.clipboard.writeText(invitation.invitation_url)
      toast.success('Invitation link copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Failed to copy invitation link')
    }
  }

  const handleRevokeInvitation = async (invitation: Invitation) => {
    try {
      await revokeInvitation(invitation.id)
      setInvitations(prev => 
        prev.map(inv => 
          inv.id === invitation.id 
            ? { ...inv, status: 'revoked' as const }
            : inv
        )
      )
      setStats(prev => prev ? { 
        ...prev, 
        pending: prev.pending - 1, 
        revoked: prev.revoked + 1 
      } : null)
      toast.success('Invitation revoked successfully')
    } catch (err) {
      console.error('Failed to revoke invitation:', err)
      toast.error('Failed to revoke invitation')
    }
  }

  const getStatusBadge = (status: Invitation['status']) => {
    const variants = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      accepted: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      expired: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      revoked: { variant: 'outline' as const, icon: XCircle, color: 'text-gray-600' },
    }
    
    const { variant, icon: Icon, color } = variants[status]
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading your invitations...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
          <Button onClick={() => void loadData()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invitations</h1>
          <p className="text-muted-foreground">Manage your sent invitations</p>
        </div>
        <Button onClick={() => void handleGenerateInvitation()} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Generate Invitation
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accepted}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.expired}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revoked</CardTitle>
              <XCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.revoked}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Invitations</CardTitle>
          <CardDescription>
            {invitations.length === 0 
              ? "You haven't sent any invitations yet." 
              : `You have sent ${String(invitations.length)} invitation${invitations.length === 1 ? '' : 's'}.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-lg font-medium">No invitations yet</p>
                <p className="text-muted-foreground">Generate your first invitation to get started!</p>
              </div>
              <Button onClick={() => void handleGenerateInvitation()} disabled={isGenerating}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Your First Invitation
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(invitation.status)}
                      <span className="text-sm text-muted-foreground font-mono">
                        {invitation.code.slice(0, 8)}...
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                      </div>
                      
                      {invitation.recipient && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Accepted by {invitation.recipient.name}
                        </div>
                      )}
                      
                      {invitation.expires_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCopyInvitation(invitation)}
                      disabled={invitation.status !== 'pending'}
                      title="Copy invitation link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    
                    {invitation.status === 'pending' && (
                      <>
                        <InvitationShare 
                          invitationUrl={invitation.invitation_url}
                          invitationCode={invitation.code}
                        />
                        <InvitationQRCode 
                          invitationUrl={invitation.invitation_url}
                          invitationCode={invitation.code}
                        />
                      </>
                    )}
                    
                    {invitation.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleRevokeInvitation(invitation)}
                        title="Revoke invitation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}