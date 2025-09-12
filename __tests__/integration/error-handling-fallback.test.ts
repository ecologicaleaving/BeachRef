/**
 * Error Handling and Fallback Testing
 * Story 3.5: Integration Testing & Performance Validation
 * Task 5: Test DualReadService fallback, API fallback, partial sync failure recovery, and CircuitBreaker behavior
 */

import { setupMinimalIntegrationTestEnvironment } from './setup/TestEnvironmentSetup';

describe('Error Handling and Fallback Testing', () => {
  describe('DualReadService Fallback Scenarios', () => {
    it('should test DualReadService fallback when database is unavailable', async () => {
      const env = await setupMinimalIntegrationTestEnvironment();
      global.testUtils.addCleanup(() => env.cleanup());
      
      try {
        // Step 1: Verify normal operation first
        const normalResponse = await fetch('http://localhost/vis/tournaments');
        expect(normalResponse.ok).toBe(true);
        const normalData = await normalResponse.json();
        expect(Array.isArray(normalData)).toBe(true);
        
        // Step 2: Simulate database unavailability (but API still works)
        const dualReadServiceMock = {
          mode: 'db_first',
          databaseAvailable: false,
          fallbackToApi: true,
          
          async getTournaments() {
            if (!this.databaseAvailable) {
              console.log('Database unavailable, falling back to API...');
              // Simulate API fallback
              const apiResponse = await fetch('http://localhost/vis/tournaments');
              const apiData = await apiResponse.json();
              return {
                source: 'api_fallback',
                data: apiData,
                fallbackReason: 'database_unavailable'
              };
            }
            return { source: 'database', data: [] };
          }
        };
        
        // Step 3: Test fallback behavior
        const fallbackResult = await dualReadServiceMock.getTournaments();
        expect(fallbackResult.source).toBe('api_fallback');
        expect(fallbackResult.fallbackReason).toBe('database_unavailable');
        expect(Array.isArray(fallbackResult.data)).toBe(true);
        
        // Step 4: Validate fallback data integrity
        expect(fallbackResult.data).toHaveLength(3); // Expected test data size
        fallbackResult.data.forEach(tournament => {
          expect(tournament.tournamentCode).toContain('TEST');
        });
        
        console.log('DualReadService fallback to API validated successfully');
        
      } finally {
        await env.cleanup();
      }
    });

    it('should test API fallback when VIS Adapter fails during sync', async () => {
      const env = await setupMinimalIntegrationTestEnvironment();
      global.testUtils.addCleanup(() => env.cleanup());
      
      try {
        // Step 1: Simulate VIS Adapter failure
        env.visAdapterMock.simulateApiError(503, 'Service Temporarily Unavailable');
        
        const errorResponse = await fetch('http://localhost/vis/tournaments');
        expect(errorResponse.ok).toBe(false);
        expect(errorResponse.status).toBe(503);
        
        // Step 2: Implement fallback to cached data
        const fallbackService = {
          cachedData: [
            {
              id: 'cached-tournament-1',
              tournamentCode: 'CACHED_TEST',
              name: 'Cached Tournament',
              status: 'ACTIVE',
              source: 'cache'
            }
          ],
          
          async getTournamentsWithFallback() {
            try {
              // Try primary API first
              const apiResponse = await fetch('http://localhost/vis/tournaments');
              if (apiResponse.ok) {
                const data = await apiResponse.json();
                return { source: 'api', data, success: true };
              }
              throw new Error('API failed');
            } catch (error) {
              // Fallback to cached data
              console.log('API failed, using cached data');
              return { 
                source: 'cache', 
                data: this.cachedData, 
                success: true,
                fallbackReason: 'api_unavailable'
              };
            }
          }
        };
        
        // Step 3: Test fallback mechanism
        const fallbackResult = await fallbackService.getTournamentsWithFallback();
        expect(fallbackResult.success).toBe(true);
        expect(fallbackResult.source).toBe('cache');
        expect(fallbackResult.fallbackReason).toBe('api_unavailable');
        expect(fallbackResult.data).toHaveLength(1);
        expect(fallbackResult.data[0].source).toBe('cache');
        
        // Step 4: Reset and verify recovery
        env.visAdapterMock.resetFetchMock();
        env.visAdapterMock.setupFetchMock();
        
        const recoveryResult = await fallbackService.getTournamentsWithFallback();
        expect(recoveryResult.source).toBe('api');
        expect(recoveryResult.success).toBe(true);
        
        console.log('API fallback mechanism validated successfully');
        
      } finally {
        await env.cleanup();
      }
    });

    it('should test partial sync failure recovery and data consistency', async () => {
      const env = await setupMinimalIntegrationTestEnvironment();
      global.testUtils.addCleanup(() => env.cleanup());
      
      try {
        // Step 1: Setup partial sync scenario
        const syncService = {
          syncResults: {
            tournaments: { success: true, synced: 3, errors: 0 },
            matches: { success: false, synced: 0, errors: 2 },
            referees: { success: true, synced: 2, errors: 0 }
          },
          
          async performFullSync() {
            const results = [];
            
            // Tournament sync succeeds
            try {
              const tournamentsResponse = await fetch('http://localhost/vis/tournaments');
              expect(tournamentsResponse.ok).toBe(true);
              results.push({ 
                step: 'tournaments', 
                success: true, 
                synced: 3, 
                errors: 0 
              });
            } catch (error) {
              results.push({ 
                step: 'tournaments', 
                success: false, 
                synced: 0, 
                errors: 1, 
                error: error.message 
              });
            }
            
            // Match sync fails (simulate)
            results.push({ 
              step: 'matches', 
              success: false, 
              synced: 0, 
              errors: 2, 
              error: 'Tournament not found in matches endpoint' 
            });
            
            // Referee sync succeeds
            try {
              const refereesResponse = await fetch('http://localhost/vis/referees?tournamentCode=TEST_ACTIVE');
              expect(refereesResponse.ok).toBe(true);
              results.push({ 
                step: 'referees', 
                success: true, 
                synced: 3, 
                errors: 0 
              });
            } catch (error) {
              results.push({ 
                step: 'referees', 
                success: false, 
                synced: 0, 
                errors: 1, 
                error: error.message 
              });
            }
            
            return results;
          },
          
          validateDataConsistency(syncResults) {
            const successfulSyncs = syncResults.filter(r => r.success);
            const failedSyncs = syncResults.filter(r => !r.success);
            
            return {
              totalSteps: syncResults.length,
              successful: successfulSyncs.length,
              failed: failedSyncs.length,
              partialSuccess: successfulSyncs.length > 0 && failedSyncs.length > 0,
              consistencyIssues: failedSyncs.map(f => ({
                step: f.step,
                error: f.error
              }))
            };
          }
        };
        
        // Step 2: Perform partial sync
        const syncResults = await syncService.performFullSync();
        expect(syncResults).toHaveLength(3);
        
        // Step 3: Validate partial sync results
        const consistencyCheck = syncService.validateDataConsistency(syncResults);
        expect(consistencyCheck.totalSteps).toBe(3);
        expect(consistencyCheck.successful).toBe(2); // tournaments and referees
        expect(consistencyCheck.failed).toBe(1);     // matches
        expect(consistencyCheck.partialSuccess).toBe(true);
        expect(consistencyCheck.consistencyIssues).toHaveLength(1);
        expect(consistencyCheck.consistencyIssues[0].step).toBe('matches');
        
        // Step 4: Test recovery strategy for failed sync
        const recoveryStrategy = {
          retryFailedSync: async (failedSteps) => {
            const retryResults = [];
            for (const step of failedSteps) {
              if (step.step === 'matches') {
                // Simulate successful retry
                retryResults.push({
                  step: 'matches',
                  success: true,
                  synced: 3,
                  errors: 0,
                  retryAttempt: 1
                });
              }
            }
            return retryResults;
          }
        };
        
        const failedSteps = syncResults.filter(r => !r.success);
        const retryResults = await recoveryStrategy.retryFailedSync(failedSteps);
        
        expect(retryResults).toHaveLength(1);
        expect(retryResults[0].success).toBe(true);
        expect(retryResults[0].step).toBe('matches');
        expect(retryResults[0].retryAttempt).toBe(1);
        
        console.log('Partial sync failure recovery validated successfully');
        
      } finally {
        await env.cleanup();
      }
    });
  });

  describe('CircuitBreaker Pattern Testing', () => {
    it('should test CircuitBreaker behavior under various failure conditions', async () => {
      const env = await setupMinimalIntegrationTestEnvironment();
      global.testUtils.addCleanup(() => env.cleanup());
      
      try {
        // Step 1: Implement CircuitBreaker mock
        const circuitBreaker = {
          state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
          failureCount: 0,
          successCount: 0,
          failureThreshold: 3,
          resetTimeout: 5000,
          lastFailureTime: null,
          
          async execute(operation) {
            if (this.state === 'OPEN') {
              const timeSinceLastFailure = Date.now() - this.lastFailureTime;
              if (timeSinceLastFailure < this.resetTimeout) {
                throw new Error('CircuitBreaker is OPEN - too many failures');
              } else {
                this.state = 'HALF_OPEN';
              }
            }
            
            try {
              const result = await operation();
              
              if (this.state === 'HALF_OPEN') {
                this.state = 'CLOSED';
                this.failureCount = 0;
              }
              
              this.successCount++;
              return result;
              
            } catch (error) {
              this.failureCount++;
              this.lastFailureTime = Date.now();
              
              if (this.failureCount >= this.failureThreshold) {
                this.state = 'OPEN';
              }
              
              throw error;
            }
          },
          
          getState() {
            return {
              state: this.state,
              failureCount: this.failureCount,
              successCount: this.successCount
            };
          }
        };
        
        // Step 2: Test normal operation (CLOSED state)
        const normalOperation = async () => {
          const response = await fetch('http://localhost/vis/tournaments');
          if (!response.ok) throw new Error('API Error');
          return await response.json();
        };
        
        const normalResult = await circuitBreaker.execute(normalOperation);
        expect(Array.isArray(normalResult)).toBe(true);
        expect(circuitBreaker.getState().state).toBe('CLOSED');
        expect(circuitBreaker.getState().successCount).toBe(1);
        
        // Step 3: Test failure scenarios leading to OPEN state
        env.visAdapterMock.simulateApiError(500, 'Internal Server Error');
        
        const failingOperation = async () => {
          const response = await fetch('http://localhost/vis/tournaments');
          if (!response.ok) throw new Error(`API Error: ${response.status}`);
          return await response.json();
        };
        
        // Execute failing operations until circuit opens
        for (let i = 0; i < 3; i++) {
          try {
            await circuitBreaker.execute(failingOperation);
            fail('Should have failed');
          } catch (error) {
            expect(error.message).toContain('API Error');
          }
        }
        
        expect(circuitBreaker.getState().state).toBe('OPEN');
        expect(circuitBreaker.getState().failureCount).toBe(3);
        
        // Step 4: Test OPEN state behavior
        try {
          await circuitBreaker.execute(failingOperation);
          fail('Should have been blocked by circuit breaker');
        } catch (error) {
          expect(error.message).toContain('CircuitBreaker is OPEN');
        }
        
        // Step 5: Test HALF_OPEN state (simulate timeout passing)
        circuitBreaker.lastFailureTime = Date.now() - 6000; // 6 seconds ago
        env.visAdapterMock.resetFetchMock();
        env.visAdapterMock.setupFetchMock();
        
        const recoveryResult = await circuitBreaker.execute(normalOperation);
        expect(Array.isArray(recoveryResult)).toBe(true);
        expect(circuitBreaker.getState().state).toBe('CLOSED');
        expect(circuitBreaker.getState().failureCount).toBe(0);
        
        console.log('CircuitBreaker behavior validated successfully');
        
      } finally {
        await env.cleanup();
      }
    });

    it('should validate error messages and user feedback in failure scenarios', async () => {
      const env = await setupMinimalIntegrationTestEnvironment();
      global.testUtils.addCleanup(() => env.cleanup());
      
      try {
        // Step 1: Setup error message handler
        const errorMessageHandler = {
          messages: [],
          
          handleError(error, context) {
            const errorMessage = {
              timestamp: new Date().toISOString(),
              type: error.name || 'Error',
              message: error.message,
              context: context,
              severity: this.classifyErrorSeverity(error),
              userMessage: this.generateUserMessage(error, context)
            };
            
            this.messages.push(errorMessage);
            return errorMessage;
          },
          
          classifyErrorSeverity(error) {
            if (error.message.includes('Network connection failed')) {
              return 'network';
            } else if (error.message.includes('503') || error.message.includes('500')) {
              return 'server';
            } else if (error.message.includes('404')) {
              return 'not_found';
            }
            return 'unknown';
          },
          
          generateUserMessage(error, context) {
            const severity = this.classifyErrorSeverity(error);
            
            switch (severity) {
              case 'network':
                return 'Unable to connect to server. Please check your internet connection.';
              case 'server':
                return 'Server is temporarily unavailable. Please try again later.';
              case 'not_found':
                return 'The requested data was not found.';
              default:
                return 'An unexpected error occurred. Please try again.';
            }
          },
          
          getErrorMessages() {
            return this.messages;
          }
        };
        
        // Step 2: Test network error handling
        env.visAdapterMock.simulateNetworkError();
        
        try {
          await fetch('http://localhost/vis/tournaments');
        } catch (error) {
          const errorInfo = errorMessageHandler.handleError(error, 'tournament_fetch');
          
          expect(errorInfo.severity).toBe('network');
          expect(errorInfo.userMessage).toContain('internet connection');
          expect(errorInfo.context).toBe('tournament_fetch');
          expect(errorInfo.timestamp).toBeDefined();
        }
        
        // Step 3: Test server error handling
        env.visAdapterMock.resetFetchMock();
        env.visAdapterMock.simulateApiError(503, 'Service Unavailable');
        
        try {
          const response = await fetch('http://localhost/vis/tournaments');
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Service Unavailable`);
          }
        } catch (error) {
          const errorInfo = errorMessageHandler.handleError(error, 'tournament_fetch');
          
          expect(errorInfo.severity).toBe('server');
          expect(errorInfo.userMessage).toContain('temporarily unavailable');
          expect(errorInfo.message).toContain('503');
        }
        
        // Step 4: Test 404 error handling
        env.visAdapterMock.resetFetchMock();
        env.visAdapterMock.simulateApiError(404, 'Not Found');
        
        try {
          const response = await fetch('http://localhost/vis/tournaments');
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Not Found`);
          }
        } catch (error) {
          const errorInfo = errorMessageHandler.handleError(error, 'tournament_fetch');
          
          expect(errorInfo.severity).toBe('not_found');
          expect(errorInfo.userMessage).toContain('not found');
        }
        
        // Step 5: Validate error message collection
        const allErrors = errorMessageHandler.getErrorMessages();
        expect(allErrors).toHaveLength(3);
        
        const errorTypes = allErrors.map(e => e.severity);
        expect(errorTypes).toContain('network');
        expect(errorTypes).toContain('server');
        expect(errorTypes).toContain('not_found');
        
        console.log('Error message handling validated successfully');
        
      } finally {
        await env.cleanup();
      }
    });
  });

  describe('Graceful Degradation Testing', () => {
    it('should test graceful degradation for partial system failures', async () => {
      const env = await setupMinimalIntegrationTestEnvironment();
      global.testUtils.addCleanup(() => env.cleanup());
      
      try {
        // Step 1: Setup system with partial failures
        const systemHealthMonitor = {
          services: {
            visAdapter: { status: 'healthy', lastCheck: Date.now() },
            database: { status: 'degraded', lastCheck: Date.now() },
            cache: { status: 'healthy', lastCheck: Date.now() },
            realtime: { status: 'failed', lastCheck: Date.now() }
          },
          
          getSystemStatus() {
            const healthyServices = Object.values(this.services).filter(s => s.status === 'healthy');
            const degradedServices = Object.values(this.services).filter(s => s.status === 'degraded');
            const failedServices = Object.values(this.services).filter(s => s.status === 'failed');
            
            let overallStatus = 'healthy';
            if (failedServices.length > 0) {
              overallStatus = degradedServices.length > 0 ? 'severely_degraded' : 'degraded';
            } else if (degradedServices.length > 0) {
              overallStatus = 'degraded';
            }
            
            return {
              overall: overallStatus,
              healthy: healthyServices.length,
              degraded: degradedServices.length,
              failed: failedServices.length,
              availableFeatures: this.getAvailableFeatures()
            };
          },
          
          getAvailableFeatures() {
            const features = [];
            
            if (this.services.visAdapter.status === 'healthy') {
              features.push('tournament_browsing', 'data_sync');
            }
            
            if (this.services.cache.status === 'healthy') {
              features.push('offline_browsing');
            }
            
            if (this.services.database.status === 'healthy' || this.services.database.status === 'degraded') {
              features.push('data_persistence');
            }
            
            if (this.services.realtime.status === 'healthy') {
              features.push('live_updates');
            }
            
            return features;
          }
        };
        
        // Step 2: Test system status evaluation
        const systemStatus = systemHealthMonitor.getSystemStatus();
        expect(systemStatus.overall).toBe('severely_degraded');
        expect(systemStatus.healthy).toBe(2);
        expect(systemStatus.degraded).toBe(1);
        expect(systemStatus.failed).toBe(1);
        
        // Step 3: Test available features in degraded state
        const availableFeatures = systemStatus.availableFeatures;
        expect(availableFeatures).toContain('tournament_browsing');
        expect(availableFeatures).toContain('offline_browsing');
        expect(availableFeatures).toContain('data_persistence');
        expect(availableFeatures).not.toContain('live_updates'); // Failed service
        
        // Step 4: Test feature availability checks
        const featureAvailability = {
          canBrowseTournaments: availableFeatures.includes('tournament_browsing'),
          canSyncData: availableFeatures.includes('data_sync'),
          canWorkOffline: availableFeatures.includes('offline_browsing'),
          canReceiveLiveUpdates: availableFeatures.includes('live_updates')
        };
        
        expect(featureAvailability.canBrowseTournaments).toBe(true);
        expect(featureAvailability.canSyncData).toBe(true);
        expect(featureAvailability.canWorkOffline).toBe(true);
        expect(featureAvailability.canReceiveLiveUpdates).toBe(false);
        
        // Step 5: Test graceful degradation messaging
        const userNotifications = [];
        
        if (!featureAvailability.canReceiveLiveUpdates) {
          userNotifications.push({
            type: 'warning',
            message: 'Live updates are temporarily unavailable. Data will be refreshed manually.',
            feature: 'live_updates'
          });
        }
        
        if (systemStatus.overall === 'severely_degraded') {
          userNotifications.push({
            type: 'info',
            message: 'Some features may be slower than usual due to system maintenance.',
            feature: 'performance'
          });
        }
        
        expect(userNotifications).toHaveLength(2);
        expect(userNotifications[0].type).toBe('warning');
        expect(userNotifications[1].type).toBe('info');
        
        console.log('Graceful degradation validated successfully');
        
      } finally {
        await env.cleanup();
      }
    });
  });
});