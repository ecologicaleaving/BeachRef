/**
 * Google Analytics 4 (gtag.js) TypeScript declarations
 * Provides type safety for GA4 integration
 */

interface Window {
  dataLayer: any[];
  gtag: (
    command: 'config' | 'event' | 'js' | 'set',
    targetId: string | Date,
    config?: {
      send_page_view?: boolean;
      page_path?: string;
      page_location?: string;
      page_title?: string;
      [key: string]: any;
    }
  ) => void;
}
