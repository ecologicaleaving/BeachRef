'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { TournamentDetail } from '@/lib/types'
import { buildReturnUrl, getCurrentYear } from '@/lib/url-utils'
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbSeparator, 
  BreadcrumbPage 
} from '@/components/ui/breadcrumb'

interface TournamentBreadcrumbProps {
  tournament: TournamentDetail
  totalCount?: number
  currentPosition?: number
}

export default function TournamentBreadcrumb({ 
  tournament, 
  totalCount, 
  currentPosition 
}: TournamentBreadcrumbProps) {
  const searchParams = useSearchParams()
  
  // Build return URL maintaining current filter state
  const getReturnUrl = () => buildReturnUrl(searchParams)

  // Format tournament context for breadcrumb
  const formatTournamentContext = () => {
    const year = getCurrentYear(searchParams)
    let context = `Tournaments ${year}`
    
    if (totalCount) {
      context += ` (${totalCount})`
    }
    
    return context
  }

  // Format current tournament page info
  const formatCurrentTournament = () => {
    let tournamentInfo = tournament.name
    
    if (currentPosition && totalCount) {
      tournamentInfo += ` (${currentPosition} of ${totalCount})`
    }
    
    return tournamentInfo
  }

  if (!tournament?.name) {
    console.warn('[TournamentBreadcrumb] Tournament name is missing')
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={getReturnUrl()} className="hover:text-foreground transition-colors">
                {formatTournamentContext()}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[200px] truncate">
              Loading...
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={getReturnUrl()} className="hover:text-foreground transition-colors">
              {formatTournamentContext()}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="max-w-[200px] sm:max-w-[300px] md:max-w-[400px] truncate">
            {formatCurrentTournament()}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}