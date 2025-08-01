'use client'

import { Match } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog'

interface MatchDetailDialogProps {
  match: Match | null
  isOpen: boolean
  onClose: () => void
}

export default function MatchDetailDialog({ match, isOpen, onClose }: MatchDetailDialogProps) {
  if (!match) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-full max-w-[95vw] md:max-w-[425px] max-h-[90vh] md:max-h-[600px]"
        aria-describedby="match-dialog-description"
      >
        <DialogHeader>
          <DialogTitle>{match.team1} vs {match.team2}</DialogTitle>
          <DialogDescription id="match-dialog-description">
            {formatDate(match.date)} at {match.time}
            {match.court && ` - ${match.court}`}
            {match.round && ` - ${match.round}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {match.result ? (
            <div className="space-y-2">
              <h4 className="font-semibold">Match Result</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Set</TableHead>
                    <TableHead className="text-center">{match.team1}</TableHead>
                    <TableHead className="text-center">{match.team2}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Set 1</TableCell>
                    <TableCell className="text-center font-mono">{match.result.set1.team1}</TableCell>
                    <TableCell className="text-center font-mono">{match.result.set1.team2}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Set 2</TableCell>
                    <TableCell className="text-center font-mono">{match.result.set2.team1}</TableCell>
                    <TableCell className="text-center font-mono">{match.result.set2.team2}</TableCell>
                  </TableRow>
                  {match.result.set3 && (
                    <TableRow>
                      <TableCell className="font-medium">Set 3</TableCell>
                      <TableCell className="text-center font-mono">{match.result.set3.team1}</TableCell>
                      <TableCell className="text-center font-mono">{match.result.set3.team2}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>Match has not been completed yet.</p>
              {match.status === 'live' && (
                <p className="text-sm mt-2 text-orange-600 font-medium">Match is currently in progress</p>
              )}
              {match.status === 'scheduled' && (
                <p className="text-sm mt-2">Match is scheduled to begin at {match.time}</p>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="min-h-[48px]">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}