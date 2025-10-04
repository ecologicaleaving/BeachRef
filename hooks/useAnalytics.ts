import { useEffect } from "react";

/**
 * Google Analytics 4 integration hook for web platform
 * Dynamically loads GA4 script and tracks page views
 *
 * @param pathname - Current route pathname from Expo Router
 */
export function useAnalytics(pathname: string) {
  useEffect(() => {
    const gaId = process.env.EXPO_PUBLIC_GA_ID;

    // Debug logging
    console.log("[GA Debug] Environment check:", {
      gaId,
      isWeb: typeof window !== "undefined",
      pathname
    });

    // Only run on web platform with valid GA ID
    if (!gaId || typeof window === "undefined") {
      console.warn("[GA Debug] Analytics disabled - missing GA ID or not web platform");
      return;
    }

    // Initialize gtag if not already loaded
    if (!window.gtag) {
      console.log("[GA Debug] Initializing gtag for ID:", gaId);

      // Initialize dataLayer and gtag function first
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: any[]) {
        (window.dataLayer as any).push(args);
      }
      (window as any).gtag = gtag;

      // Set default consent to denied (GDPR compliance)
      const savedConsent = localStorage.getItem('cookieConsent');
      gtag('consent', 'default', {
        'analytics_storage': savedConsent === 'granted' ? 'granted' : 'denied'
      });

      // Load gtag script
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;

      script.onload = () => console.log("[GA Debug] gtag script loaded successfully");
      script.onerror = (err) => console.error("[GA Debug] Failed to load gtag script:", err);

      document.head.appendChild(script);

      gtag("js", new Date());
      gtag("config", gaId, { send_page_view: false });
      console.log("[GA Debug] gtag configured with consent mode");
    }

    // Send page_view event on pathname change
    if (window.gtag) {
      console.log("[GA Debug] Sending page_view event:", {
        gaId,
        pathname,
        location: window.location.href,
        title: document.title
      });

      window.gtag("event", "page_view", {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
        debug_mode: true,
      });

      // Check dataLayer after sending
      setTimeout(() => {
        console.log("[GA Debug] dataLayer contents:", window.dataLayer);
      }, 100);
    } else {
      console.warn("[GA Debug] gtag not available, skipping page_view");
    }
  }, [pathname]);
}
