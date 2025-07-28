import { config } from '../config/environment';
import { VISService } from './vis.service';
import { MockVISService } from './mock-vis.service';
import { visLogger } from '../utils/logger';

export class VISFactoryService {
  private static instance: VISService | MockVISService;

  static getInstance(): VISService | MockVISService {
    if (!VISFactoryService.instance) {
      if (config.demoMode) {
        visLogger.info('Initializing VIS service in demo mode with mock data');
        VISFactoryService.instance = new MockVISService();
      } else {
        visLogger.info('Initializing VIS service with real API connection');
        VISFactoryService.instance = new VISService();
      }
    }
    return VISFactoryService.instance;
  }

  static isDemoMode(): boolean {
    return config.demoMode;
  }
}

export const visService = VISFactoryService.getInstance();