import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPlacementTerms } from '@/api/legal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ExternalLink, Loader2 } from 'lucide-react'

interface PlacementTermsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Simple markdown-to-JSX renderer for the placement terms.
 * Handles basic markdown: headers, bold, numbered lists.
 */
function renderMarkdown(markdown: string): React.ReactNode[] {
  const lines = markdown.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (const line of lines) {
    // Skip empty lines but add spacing
    if (line.trim() === '') {
      elements.push(<div key={key++} className="h-2" />)
      continue
    }

    // H1 header
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={key++} className="text-xl font-bold mb-4">
          {line.slice(2)}
        </h1>
      )
      continue
    }

    // Numbered list items with bold text
    const listMatch = /^(\d+)\.\s+\*\*(.+?)\*\*(.*)$/.exec(line)
    if (listMatch) {
      const [, , boldPart, rest] = listMatch
      elements.push(
        <div key={key++} className="mb-3">
          <p className="font-semibold text-sm">{boldPart}</p>
          {rest && <p className="text-sm text-muted-foreground ml-0">{rest.trim()}</p>}
        </div>
      )
      continue
    }

    // Indented continuation (starts with spaces)
    if (line.startsWith('   ')) {
      elements.push(
        <p key={key++} className="text-sm text-muted-foreground mb-2">
          {line.trim()}
        </p>
      )
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="text-sm mb-2">
        {line}
      </p>
    )
  }

  return elements
}

export const PlacementTermsDialog: React.FC<PlacementTermsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['placement-terms'],
    queryFn: getPlacementTerms,
    enabled: open,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Placement Terms & Conditions</DialogTitle>
          <DialogDescription>
            Please read these terms carefully before creating a placement request.
            {data?.version && <span className="text-xs ml-2">(Version: {data.version})</span>}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive">
              Failed to load terms. Please try again later.
            </div>
          )}
          {data && <div className="prose prose-sm max-w-none">{renderMarkdown(data.content)}</div>}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

interface PlacementTermsLinkProps {
  className?: string
}

export const PlacementTermsLink: React.FC<PlacementTermsLinkProps> = ({ className }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); }}
        className={`inline-flex items-center gap-1 text-primary hover:underline font-medium ${className ?? ''}`}
      >
        Placement Terms & Conditions
        <ExternalLink className="h-3 w-3" />
      </button>
      <PlacementTermsDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export default PlacementTermsDialog
