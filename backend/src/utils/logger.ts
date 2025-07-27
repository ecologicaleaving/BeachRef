import winston from 'winston';
import { config } from '../config/environment';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Create custom formats
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports: winston.transport[] = [
  // Console transport for development
  new winston.transports.Console({
    format: consoleFormat,
    level: config.logging.level,
  }),
];

// Add file transports for production
if (config.nodeEnv === 'production') {
  // Ensure logs directory exists
  const fs = require('fs');
  const path = require('path');
  const logsDir = path.join(process.cwd(), 'logs');
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  transports.push(
    // Error log file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  transports,
  exitOnError: false,
});

// VIS-specific logging functions
export const visLogger = {
  request: (method: string, url: string, requestId?: string) => {
    logger.http(`VIS API Request: ${method} ${url}`, {
      service: 'vis-api',
      type: 'request',
      method,
      url,
      requestId,
      timestamp: new Date().toISOString()
    });
  },

  response: (method: string, url: string, status: number, responseTime: number, requestId?: string) => {
    const level = status >= 400 ? 'warn' : 'http';
    logger.log(level, `VIS API Response: ${status} ${method} ${url} - ${responseTime}ms`, {
      service: 'vis-api',
      type: 'response',
      method,
      url,
      status,
      responseTime,
      requestId,
      timestamp: new Date().toISOString()
    });
  },

  error: (message: string, error: Error, context?: any) => {
    logger.error(`VIS API Error: ${message}`, {
      service: 'vis-api',
      type: 'error',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString()
    });
  },

  health: (status: string, responseTime?: number, error?: string) => {
    const level = status === 'healthy' ? 'info' : 'warn';
    logger.log(level, `VIS Health Check: ${status}`, {
      service: 'vis-api',
      type: 'health',
      status,
      responseTime,
      error,
      timestamp: new Date().toISOString()
    });
  },

  cache: (action: string, key: string, hit?: boolean) => {
    logger.debug(`Cache ${action}: ${key}`, {
      service: 'cache',
      type: 'cache',
      action,
      key,
      hit,
      timestamp: new Date().toISOString()
    });
  },

  performance: (operation: string, duration: number, details?: any) => {
    const level = duration > 5000 ? 'warn' : 'info';
    logger.log(level, `Performance: ${operation} completed in ${duration}ms`, {
      service: 'performance',
      type: 'performance',
      operation,
      duration,
      details,
      timestamp: new Date().toISOString()
    });
  },

  info: (message: string, context?: any) => {
    logger.info(`VIS API: ${message}`, {
      service: 'vis-api',
      type: 'info',
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }
};

// Application-specific logging functions
export const appLogger = {
  startup: (message: string, port?: number) => {
    logger.info(`Application: ${message}`, {
      service: 'application',
      type: 'startup',
      port,
      environment: config.nodeEnv,
      timestamp: new Date().toISOString()
    });
  },

  shutdown: (message: string, signal?: string) => {
    logger.info(`Application: ${message}`, {
      service: 'application',
      type: 'shutdown',
      signal,
      timestamp: new Date().toISOString()
    });
  },

  request: (method: string, url: string, statusCode: number, responseTime: number, userAgent?: string) => {
    const level = statusCode >= 400 ? 'warn' : 'http';
    logger.log(level, `${method} ${url} - ${statusCode} - ${responseTime}ms`, {
      service: 'application',
      type: 'request',
      method,
      url,
      statusCode,
      responseTime,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },

  error: (message: string, error: Error, context?: any) => {
    logger.error(`Application Error: ${message}`, {
      service: 'application',
      type: 'error',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString()
    });
  },

  security: (event: string, details: any) => {
    logger.warn(`Security Event: ${event}`, {
      service: 'security',
      type: 'security',
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

export default logger;