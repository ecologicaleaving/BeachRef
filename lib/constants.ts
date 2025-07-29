export const VIS_API_CONFIG = {
  baseURL: 'https://www.fivb.org/vis2009/XmlRequest.asmx',
  appId: '2a9523517c52420da73d927c6d6bab23',
  timeout: 10000,
  maxRetries: 3,
} as const

export const APP_CONFIG = {
  name: 'BeachRef MVP',
  description: 'FIVB Beach Volleyball Tournament Viewer',
  version: '1.0.0',
} as const