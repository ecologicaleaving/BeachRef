/**
 * @jest-environment jsdom
 */

import { 
  analyzeTournamentContext, 
  isValidTabId, 
  getContextAnalysisExplanation,
  shouldHighlightTab
} from '@/utils/tournament-context-analysis'
import { TournamentDetail } from '@/lib/types'

describe('tournament-context-analysis', () => {
  const mockTournament: TournamentDetail = {
    code: 'BEACH2025',
    name: 'Test Beach Tournament',
    countryCode: 'US',
    startDate: '2025-12-01',
    endDate: '2025-12-07',
    gender: 'Mixed',
    type: 'International',
    status: 'upcoming'
  }

  describe('isValidTabId', () => {
    it('should validate correct tab IDs', () => {
      expect(isValidTabId('overview')).toBe(true)
      expect(isValidTabId('schedule')).toBe(true)
      expect(isValidTabId('results')).toBe(true)
    })

    it('should reject invalid tab IDs', () => {
      expect(isValidTabId('invalid')).toBe(false)
      expect(isValidTabId('')).toBe(false)
      expect(isValidTabId('OVERVIEW')).toBe(false)
    })
  })

  describe('analyzeTournamentContext', () => {
    describe('user preference override', () => {
      it('should use user preference when provided', () => {
        const analysis = analyzeTournamentContext(mockTournament, 'schedule')
        
        expect(analysis.recommendedTab).toBe('schedule')
        expect(analysis.reason).toBe('user_preference')
        expect(analysis.confidence).toBe('high')
      })

      it('should ignore invalid user preferences', () => {
        const analysis = analyzeTournamentContext(mockTournament, 'invalid')
        
        expect(analysis.recommendedTab).not.toBe('invalid')
        expect(analysis.reason).not.toBe('user_preference')
      })
    })

    describe('tournament completion status', () => {
      it('should recommend results tab for completed tournaments', () => {
        const completedTournament = {
          ...mockTournament,
          status: 'completed' as const
        }
        
        const analysis = analyzeTournamentContext(completedTournament)
        
        expect(analysis.recommendedTab).toBe('results')
        expect(analysis.reason).toBe('tournament_complete')
        expect(analysis.confidence).toBe('high')
        expect(analysis.isCompleted).toBe(true)
      })

      it('should recommend results tab for tournaments past end date', () => {
        const pastTournament = {
          ...mockTournament,
          endDate: '2020-01-01', // Clearly past date
          status: 'upcoming' as const // Override status to test date logic
        }
        
        const analysis = analyzeTournamentContext(pastTournament)
        
        expect(analysis.recommendedTab).toBe('results')
        expect(analysis.reason).toBe('tournament_complete')
        expect(analysis.isCompleted).toBe(true)
      })
    })

    describe('match availability', () => {
      it('should recommend schedule tab for tournaments with matches', () => {
        const tournamentWithMatches = {
          ...mockTournament,
          matches: [
            { id: '1', date: '2025-12-02', time: '10:00', team1: 'Team A', team2: 'Team B', status: 'scheduled' as const }
          ]
        } as any
        
        const analysis = analyzeTournamentContext(tournamentWithMatches)
        
        expect(analysis.recommendedTab).toBe('schedule')
        expect(analysis.reason).toBe('has_matches')
        expect(analysis.confidence).toBe('high')
        expect(analysis.hasMatches).toBe(true)
        expect(analysis.matchCount).toBe(1)
      })

      it('should handle different match data formats', () => {
        const tournamentWithScheduleData = {
          ...mockTournament,
          scheduleData: [
            { matchId: '1' },
            { matchId: '2' }
          ]
        } as any
        
        const analysis = analyzeTournamentContext(tournamentWithScheduleData)
        
        expect(analysis.recommendedTab).toBe('schedule')
        expect(analysis.reason).toBe('has_matches')
        expect(analysis.matchCount).toBe(2)
      })
    })

    describe('default fallback', () => {
      it('should recommend overview tab for tournaments without matches', () => {
        const analysis = analyzeTournamentContext(mockTournament)
        
        expect(analysis.recommendedTab).toBe('overview')
        expect(analysis.reason).toBe('no_matches')
        expect(analysis.confidence).toBe('medium')
        expect(analysis.hasMatches).toBe(false)
      })

      it('should handle null tournament gracefully', () => {
        const analysis = analyzeTournamentContext(null)
        
        expect(analysis.recommendedTab).toBe('overview')
        expect(analysis.reason).toBe('loading')
        expect(analysis.confidence).toBe('low')
      })
    })

    describe('priority ordering', () => {
      it('should prioritize user preference over tournament completion', () => {
        const completedTournament = {
          ...mockTournament,
          status: 'completed' as const
        }
        
        const analysis = analyzeTournamentContext(completedTournament, 'overview')
        
        expect(analysis.recommendedTab).toBe('overview')
        expect(analysis.reason).toBe('user_preference')
      })

      it('should prioritize user preference over match availability', () => {
        const tournamentWithMatches = {
          ...mockTournament,
          matches: [{ id: '1' }]
        } as any
        
        const analysis = analyzeTournamentContext(tournamentWithMatches, 'results')
        
        expect(analysis.recommendedTab).toBe('results')
        expect(analysis.reason).toBe('user_preference')
      })

      it('should prioritize completion over match availability', () => {
        const completedTournamentWithMatches = {
          ...mockTournament,
          status: 'completed' as const,
          matches: [{ id: '1' }]
        } as any
        
        const analysis = analyzeTournamentContext(completedTournamentWithMatches)
        
        expect(analysis.recommendedTab).toBe('results')
        expect(analysis.reason).toBe('tournament_complete')
      })
    })
  })

  describe('getContextAnalysisExplanation', () => {
    it('should provide appropriate explanations for each reason', () => {
      expect(getContextAnalysisExplanation({ 
        recommendedTab: 'overview', 
        reason: 'user_preference', 
        confidence: 'high', 
        hasMatches: false, 
        isCompleted: false 
      })).toBe('Using your preferred default tab')

      expect(getContextAnalysisExplanation({ 
        recommendedTab: 'results', 
        reason: 'tournament_complete', 
        confidence: 'high', 
        hasMatches: true, 
        isCompleted: true 
      })).toBe('Tournament completed - showing results')

      expect(getContextAnalysisExplanation({ 
        recommendedTab: 'schedule', 
        reason: 'has_matches', 
        confidence: 'high', 
        hasMatches: true, 
        isCompleted: false,
        matchCount: 5 
      })).toBe('Tournament has 5 matches - showing schedule')
    })
  })

  describe('shouldHighlightTab', () => {
    it('should highlight tabs with high confidence recommendations', () => {
      const highConfidenceAnalysis = {
        recommendedTab: 'schedule' as const,
        reason: 'has_matches' as const,
        confidence: 'high' as const,
        hasMatches: true,
        isCompleted: false
      }

      expect(shouldHighlightTab('schedule', highConfidenceAnalysis)).toBe(true)
      expect(shouldHighlightTab('overview', highConfidenceAnalysis)).toBe(false)
    })

    it('should not highlight tabs with low confidence', () => {
      const lowConfidenceAnalysis = {
        recommendedTab: 'overview' as const,
        reason: 'no_matches' as const,
        confidence: 'low' as const,
        hasMatches: false,
        isCompleted: false
      }

      expect(shouldHighlightTab('overview', lowConfidenceAnalysis)).toBe(false)
    })
  })
})