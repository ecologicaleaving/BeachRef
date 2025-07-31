'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TournamentDetail } from '@/lib/types'
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu, ArrowLeft, Share2, Calendar, MapPin } from 'lucide-react'

interface TournamentMobileActionsProps {
  tournament: TournamentDetail
}

export default function TournamentMobileActions({ tournament }: TournamentMobileActionsProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleShare = async () => {
    const shareData = {
      title: tournament.name,
      text: `Check out this beach volleyball tournament: ${tournament.name}`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        // You could show a toast here
        console.log('Link copied to clipboard')
      } catch (error) {
        console.log('Error copying to clipboard:', error)
      }
    }
    setIsOpen(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="block md:hidden fixed bottom-4 right-4">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            size="lg" 
            className="rounded-full w-14 h-14 shadow-lg min-h-[48px]"
            aria-label="Open quick actions menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              {tournament.name}
            </SheetTitle>
            <SheetDescription>
              {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start min-h-[48px]" 
              asChild
            >
              <Link href="/">
                <ArrowLeft className="mr-3 h-4 w-4" />
                Back to Tournaments
              </Link>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start min-h-[48px]"
              onClick={handleShare}
            >
              <Share2 className="mr-3 h-4 w-4" />
              Share Tournament
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start min-h-[48px]"
              onClick={() => {
                const startDate = new Date(tournament.startDate)
                const endDate = new Date(tournament.endDate)
                const title = tournament.name
                const details = `Beach Volleyball Tournament in ${tournament.countryCode}`
                
                // Create calendar event URL (Google Calendar)
                const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(details)}`
                
                window.open(calendarUrl, '_blank')
                setIsOpen(false)
              }}
            >
              <Calendar className="mr-3 h-4 w-4" />
              Add to Calendar
            </Button>
            
            {tournament.venue && (
              <Button 
                variant="outline" 
                className="w-full justify-start min-h-[48px]"
                onClick={() => {
                  const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(tournament.venue + ' ' + tournament.countryCode)}`
                  window.open(mapsUrl, '_blank')
                  setIsOpen(false)
                }}
              >
                <MapPin className="mr-3 h-4 w-4" />
                View Location
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}