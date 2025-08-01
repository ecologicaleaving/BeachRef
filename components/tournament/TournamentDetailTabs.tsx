'use client'

import { TournamentDetail } from '@/lib/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Users, Trophy, Clock, Info } from 'lucide-react'
import TournamentOverviewTab from './TournamentOverviewTab'
import TournamentScheduleTab from './TournamentScheduleTab'
import TournamentResultsTab from './TournamentResultsTab'
import TournamentTeamsTab from './TournamentTeamsTab'

interface TournamentDetailTabsProps {
  tournament: TournamentDetail
}

export default function TournamentDetailTabs({ tournament }: TournamentDetailTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview" className="flex items-center gap-2 min-h-[48px]">
          <Info className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="schedule" className="flex items-center gap-2 min-h-[48px]">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Schedule</span>
        </TabsTrigger>
        <TabsTrigger value="results" className="flex items-center gap-2 min-h-[48px]">
          <Trophy className="h-4 w-4" />
          <span className="hidden sm:inline">Results</span>
        </TabsTrigger>
        <TabsTrigger value="teams" className="flex items-center gap-2 min-h-[48px]">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Teams</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <TournamentOverviewTab tournament={tournament} />
      </TabsContent>

      <TabsContent value="schedule" className="space-y-4">
        <TournamentScheduleTab tournament={tournament} />
      </TabsContent>

      <TabsContent value="results" className="space-y-4">
        <TournamentResultsTab tournament={tournament} />
      </TabsContent>

      <TabsContent value="teams" className="space-y-4">
        <TournamentTeamsTab tournament={tournament} />
      </TabsContent>
    </Tabs>
  )
}