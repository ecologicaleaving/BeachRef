/**
 * useAssignmentPreparation Hook
 * Manages assignment preparation, notes, and status tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { Assignment, AssignmentStatus } from '../types/assignments';
import { AssignmentPreparation, AssignmentNote } from '../components/Assignment/AssignmentStatusManager';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AssignmentPreparationState {
  preparations: Map<string, AssignmentPreparation>;
  history: AssignmentNote[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  syncPending: boolean;
  lastSyncTime: Date | null;
}

const STORAGE_KEYS = {
  PREPARATIONS: '@assignment_preparations',
  HISTORY: '@assignment_history',
  PENDING_SYNC: '@pending_sync_data',
  LAST_SYNC: '@last_sync_time',
};

export const useAssignmentPreparation = () => {
  const [state, setState] = useState<AssignmentPreparationState>({
    preparations: new Map(),
    history: [],
    loading: true,
    error: null,
    isOffline: false,
    syncPending: false,
    lastSyncTime: null,
  });

  // Add item to pending sync queue - MOVED UP TO PREVENT HOISTING ISSUES
  const addToPendingSync = useCallback(async (type: string, data: any) => {
    try {
      const existingData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      const syncItems = existingData ? JSON.parse(existingData) : [];
      
      syncItems.push({
        type,
        data,
        timestamp: new Date().toISOString(),
      });
      
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(syncItems));
      
      setState(prev => ({ ...prev, syncPending: true }));
    } catch (error) {
      // console.error('Failed to add to pending sync:', error);
    }
  }, []);

  // Sync pending data when network becomes available
  const syncPendingData = useCallback(async () => {
    try {
      const pendingData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      if (!pendingData) return;

      const syncItems = JSON.parse(pendingData) as Array<{
        type: 'preparation' | 'status' | 'note';
        data: any;
        timestamp: string;
      }>;

      // Process each pending item
      for (const item of syncItems) {
        try {
          // In a real implementation, this would sync with API
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          // console.error('Failed to sync item:', error);
        }
      }

      // Clear pending sync data
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_SYNC);
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

      setState(prev => ({
        ...prev,
        syncPending: false,
        lastSyncTime: new Date(),
      }));

    } catch (error) {
      // console.error('Failed to sync pending data:', error);
    }
  }, []);

  // Load preparation data with offline support
  const loadPreparationData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Load cached data first
      const [preparationsData, historyData, lastSyncData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PREPARATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
      ]);
      
      const preparations = new Map<string, AssignmentPreparation>();
      let history: AssignmentNote[] = [];
      let lastSyncTime: Date | null = null;
      
      if (preparationsData) {
        const prepArray = JSON.parse(preparationsData) as Array<[string, AssignmentPreparation]>;
        prepArray.forEach(([key, value]) => {
          preparations.set(key, {
            ...value,
            lastUpdated: new Date(value.lastUpdated),
            notes: value.notes.map(note => ({
              ...note,
              timestamp: new Date(note.timestamp),
            })),
          });
        });
      }
      
      if (historyData) {
        history = JSON.parse(historyData).map((note: any) => ({
          ...note,
          timestamp: new Date(note.timestamp),
        }));
      }
      
      if (lastSyncData) {
        lastSyncTime = new Date(lastSyncData);
      }
      
      // Check network status
      const networkState = await NetInfo.fetch();
      const isOffline = !networkState.isConnected;
      
      // Check for pending sync data
      const pendingSyncData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      const syncPending = !!pendingSyncData;

      setState(prev => ({
        ...prev,
        preparations,
        history,
        lastSyncTime,
        isOffline,
        syncPending,
        loading: false,
      }));
      
      // Attempt sync if online and has pending data
      if (!isOffline && syncPending) {
        await syncPendingData();
      }
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load preparation data',
      }));
    }
  }, [syncPendingData]);

  // Get preparation for specific assignment
  const getPreparation = useCallback((assignmentId: string): AssignmentPreparation | undefined => {
    return state.preparations.get(assignmentId);
  }, [state.preparations]);

  // Save preparation to local storage
  const savePreparationToStorage = useCallback(async (preparations: Map<string, AssignmentPreparation>) => {
    try {
      const prepArray = Array.from(preparations.entries());
      await AsyncStorage.setItem(STORAGE_KEYS.PREPARATIONS, JSON.stringify(prepArray));
    } catch (error) {
      // console.error('Failed to save preparations to storage:', error);
    }
  }, []);

  // Save/update preparation with offline support
  const savePreparation = useCallback(async (preparation: AssignmentPreparation) => {
    try {
      // Update local state immediately
      setState(prev => {
        const newPreparations = new Map(prev.preparations);
        newPreparations.set(preparation.assignmentId, preparation);
        
        // Save to local storage
        savePreparationToStorage(newPreparations);
        
        return {
          ...prev,
          preparations: newPreparations,
        };
      });

      // Check if online
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        // Online: sync immediately
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API call
      } else {
        // Offline: add to pending sync
        await addToPendingSync('preparation', preparation);
      }
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save preparation',
      }));
    }
  }, [savePreparationToStorage, addToPendingSync]);

  // Update assignment status with offline support
  const updateAssignmentStatus = useCallback(async (
    assignmentId: string,
    newStatus: AssignmentStatus,
    assignment?: Assignment
  ) => {
    try {
      // Create history note for status change
      const historyNote: AssignmentNote = {
        id: Date.now().toString(),
        text: `Status updated to ${newStatus}${assignment ? ` for ${assignment.homeTeam} vs ${assignment.awayTeam}` : ''}`,
        timestamp: new Date(),
        type: 'general',
      };

      // Update local state immediately
      setState(prev => {
        const newHistory = [historyNote, ...prev.history];
        // Save history to local storage
        AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(newHistory));
        
        return {
          ...prev,
          history: newHistory,
        };
      });

      // Check if online
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        // Online: sync immediately
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
      } else {
        // Offline: add to pending sync
        await addToPendingSync('status', { assignmentId, newStatus, assignment });
      }
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update assignment status',
      }));
    }
  }, [addToPendingSync]);

  // Add performance note after assignment completion
  const addPerformanceNote = useCallback(async (
    assignmentId: string,
    noteText: string,
    assignment?: Assignment
  ) => {
    try {
      const performanceNote: AssignmentNote = {
        id: Date.now().toString(),
        text: noteText,
        timestamp: new Date(),
        type: 'performance',
      };

      // Add to general history
      setState(prev => ({
        ...prev,
        history: [performanceNote, ...prev.history],
      }));

      // Add to specific assignment preparation
      const currentPrep = state.preparations.get(assignmentId);
      if (currentPrep) {
        const updatedPrep: AssignmentPreparation = {
          ...currentPrep,
          notes: [performanceNote, ...currentPrep.notes],
          lastUpdated: new Date(),
        };
        await savePreparation(updatedPrep);
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to add performance note',
      }));
    }
  }, [state.preparations, savePreparation]);

  // Get assignment history (notes and status changes)
  const getAssignmentHistory = useCallback((assignmentId: string): AssignmentNote[] => {
    const preparation = state.preparations.get(assignmentId);
    if (!preparation) return [];
    
    // Combine preparation notes with any related history
    const relatedHistory = state.history.filter(note => 
      note.text.includes(assignmentId) || 
      preparation.notes.some(pNote => pNote.id === note.id)
    );

    return [...preparation.notes, ...relatedHistory]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [state.preparations, state.history]);



  // Detect schedule conflicts
  const detectScheduleConflicts = useCallback((assignments: Assignment[]): Assignment[] => {
    const conflicts: Assignment[] = [];
    const conflictWindow = 30 * 60 * 1000; // 30 minutes

    for (let i = 0; i < assignments.length; i++) {
      const current = assignments[i];
      for (let j = i + 1; j < assignments.length; j++) {
        const other = assignments[j];
        if (Math.abs(current.matchTime.getTime() - other.matchTime.getTime()) < conflictWindow) {
          if (!conflicts.find(c => c.id === current.id)) {
            conflicts.push(current);
          }
          if (!conflicts.find(c => c.id === other.id)) {
            conflicts.push(other);
          }
        }
      }
    }

    return conflicts;
  }, []);

  // Get preparation completion rate
  const getPreparationCompletionRate = useCallback((assignmentId: string): number => {
    const preparation = state.preparations.get(assignmentId);
    if (!preparation || preparation.checklist.length === 0) return 0;
    
    const completedCount = preparation.checklist.filter(item => item.completed).length;
    return Math.round((completedCount / preparation.checklist.length) * 100);
  }, [state.preparations]);

  // Monitor network changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (networkState) => {
      const wasOffline = state.isOffline;
      const isNowOffline = !networkState.isConnected;
      
      setState(prev => ({ ...prev, isOffline: isNowOffline }));
      
      // If we just came back online and have pending sync data
      if (wasOffline && !isNowOffline && state.syncPending) {
        await syncPendingData();
      }
    });

    return unsubscribe;
  }, [state.isOffline, state.syncPending, syncPendingData]);

  // Load data on mount
  useEffect(() => {
    loadPreparationData();
  }, [loadPreparationData]);

  return {
    preparations: state.preparations,
    history: state.history,
    loading: state.loading,
    error: state.error,
    isOffline: state.isOffline,
    syncPending: state.syncPending,
    lastSyncTime: state.lastSyncTime,
    getPreparation,
    savePreparation,
    updateAssignmentStatus,
    addPerformanceNote,
    getAssignmentHistory,
    detectScheduleConflicts,
    getPreparationCompletionRate,
    refreshData: loadPreparationData,
    syncPendingData,
  };
};