'use client'

/**
 * Match Status Component
 * 
 * Displays match status indicators with appropriate badges and colors.
 * Supports scheduled, live, completed, and cancelled states.
 * 
 * Features:
 * - Color-coded badge system for different match states
 * - Accessible ARIA labels for screen readers
 * - Consistent visual design with tournament theme
 * - Icon support for enhanced visual clarity
 */

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Clock, Play, CheckCircle, XCircle } from 'lucide-react'
import { MatchStatus as MatchStatusType } from '@/lib/types'

interface MatchStatusProps {
  status: MatchStatusType
  className?: string
}

const statusConfig = {
  scheduled: {
    label: 'Scheduled',
    variant: 'secondary' as const,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock,
    ariaLabel: 'Match is scheduled'
  },
  live: {
    label: 'Live',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: Play,
    ariaLabel: 'Match is currently live'
  },
  completed: {
    label: 'Completed',
    variant: 'outline' as const,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: CheckCircle,
    ariaLabel: 'Match has been completed'
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    ariaLabel: 'Match has been cancelled'
  }
}

export default function MatchStatus({ status, className = '' }: MatchStatusProps) {
  const config = statusConfig[status]
  const IconComponent = config.icon

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className} flex items-center gap-1 px-2 py-1 text-xs font-medium`}
      aria-label={config.ariaLabel}
    >
      <IconComponent className="h-3 w-3" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  )
}