import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific configuration
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ path: path.resolve(__dirname, `../../${envFile}`) });

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Demo Mode Configuration
  demoMode: process.env.DEMO_MODE === 'true' || !process.env.VIS_API_KEY,
  
  // VIS API Configuration
  visApi: {
    url: process.env.VIS_API_URL || 'https://www.fivb.org/VisSDK/VisWebService/api/v1',
    key: process.env.VIS_API_KEY || process.env.X_FIVB_APP_ID || '',
    timeout: parseInt(process.env.REQUEST_TIMEOUT || '10000', 10),
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  
  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60', 10),
  },
  
  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10),
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
};

export default config;