/**
 * useAssignmentCountdown Hook
 * Real-time countdown timer for assignment start times with urgency indicators
 */

import { useState, useEffect, useRef } from 'react';
import { colors } from '../theme/tokens';

export interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

export interface CountdownUrgency {
  level: 'low' | 'medium' | 'high' | 'critical';
  color: string;
  message: string;
}

export const useAssignmentCountdown = (targetDate: Date | null) => {
  const [countdown, setCountdown] = useState<CountdownTime>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isExpired: false,
  });
  
  const [urgency, setUrgency] = useState<CountdownUrgency>({
    level: 'low',
    color: colors.success, // success green
    message: 'On schedule',
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const calculateCountdown = (target: Date): CountdownTime => {
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
      };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      hours,
      minutes,
      seconds,
      totalSeconds,
      isExpired: false,
    };
  };

  const getUrgencyLevel = (totalSeconds: number): CountdownUrgency => {
    const totalMinutes = Math.floor(totalSeconds / 60);
    
    if (totalMinutes <= 5) {
      return {
        level: 'critical',
        color: '#8B1538', // error red
        message: 'Starting very soon!',
      };
    }
    
    if (totalMinutes <= 15) {
      return {
        level: 'high',
        color: '#B8530A', // warning orange
        message: 'Starting soon',
      };
    }
    
    if (totalMinutes <= 60) {
      return {
        level: 'medium',
        color: '#2B5F75', // secondary blue
        message: 'Preparation time',
      };
    }
    
    return {
      level: 'low',
      color: colors.success, // success green
      message: 'On schedule',
    };
  };

  const formatTime = (time: CountdownTime): string => {
    const { hours, minutes, seconds, isExpired } = time;
    
    if (isExpired) {
      return 'Match Time';
    }
    
    // For times over 1 hour, show hours and minutes
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    // For times under 1 hour but over 10 minutes, show minutes only
    if (minutes >= 10) {
      return `${minutes} min`;
    }
    
    // For times under 10 minutes, show minutes and seconds
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const updateCountdown = () => {
    if (!targetDate) {
      return;
    }

    const newCountdown = calculateCountdown(targetDate);
    const newUrgency = newCountdown.isExpired 
      ? { level: 'critical' as const, color: '#8B1538', message: 'Match in progress' }
      : getUrgencyLevel(newCountdown.totalSeconds);

    setCountdown(newCountdown);
    setUrgency(newUrgency);
  };

  // Start countdown when target date changes
  useEffect(() => {
    if (!targetDate) {
      setCountdown({
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: false,
      });
      setUrgency({
        level: 'low',
        color: colors.success,
        message: 'No upcoming assignment',
      });
      return;
    }

    // Initial calculation
    updateCountdown();

    // Set up interval for updates
    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [targetDate]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    countdown,
    urgency,
    formattedTime: formatTime(countdown),
    isUrgent: urgency.level === 'high' || urgency.level === 'critical',
    isCritical: urgency.level === 'critical',
  };
};