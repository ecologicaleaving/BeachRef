import rateLimit from 'express-rate-limit';
import { config } from '../config/environment';
import { appLogger } from '../utils/logger';

// General API rate limiting
export const generalRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    appLogger.security('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    });
  }
});

// Stricter rate limiting for VIS API endpoints
export const visRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Math.floor(config.rateLimit.maxRequests / 2), // Half the general limit
  message: {
    error: 'VIS API rate limit exceeded',
    message: 'Too many VIS API requests. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator to use default IPv6-compatible one
  handler: (req, res) => {
    appLogger.security('VIS API rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
      endpoint: 'vis-api'
    });
    
    res.status(429).json({
      error: 'VIS API rate limit exceeded',
      message: 'Too many VIS API requests. Please try again later.',
      retryAfter: 60
    });
  }
});

// Health check rate limiting (more lenient)
export const healthRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimit.maxRequests * 2, // Double the general limit
  message: {
    error: 'Health check rate limit exceeded',
    message: 'Too many health check requests. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks from localhost in development
    return config.nodeEnv === 'development' && 
           (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
  }
});

// Admin endpoints rate limiting (very strict)
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 requests per 15 minutes
  message: {
    error: 'Admin rate limit exceeded',
    message: 'Too many admin requests. Please try again later.',
    retryAfter: 900 // 15 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    appLogger.security('Admin rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
      endpoint: 'admin'
    });
    
    res.status(429).json({
      error: 'Admin rate limit exceeded',
      message: 'Too many admin requests. Please try again later.',
      retryAfter: 900
    });
  }
});

// Request queue management for VIS API
export class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private minInterval: number;

  constructor(requestsPerMinute: number = 60) {
    this.minInterval = (60 * 1000) / requestsPerMinute; // milliseconds between requests
  }

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minInterval) {
        const waitTime = this.minInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const request = this.queue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        await request();
      }
    }

    this.processing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getStatus(): { queueLength: number; processing: boolean; lastRequestTime: number } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      lastRequestTime: this.lastRequestTime
    };
  }
}

// Export singleton instance for VIS API requests
export const visRequestQueue = new RequestQueue(config.rateLimit.maxRequests);