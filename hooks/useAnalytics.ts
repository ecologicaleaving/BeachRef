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

      // Set consent to granted (professional app for referees)
      gtag('consent', 'default', {
        'analytics_storage': 'granted'
      });
      console.log("[GA Debug] Consent: granted (always on)");

      // Load gtag script
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;

      script.onload = () => {
        console.log("[GA Debug] gtag script loaded successfully");
        console.log("[GA Debug] Script URL:", script.src);
        // Test if gtag is actually callable
        setTimeout(() => {
          console.log("[GA Debug] gtag callable?", typeof window.gtag === 'function');
          console.log("[GA Debug] dataLayer initialized?", Array.isArray(window.dataLayer));
        }, 500);
      };
      script.onerror = (err) => {
        console.error("[GA Debug] Failed to load gtag script:", err);
        console.error("[GA Debug] Script URL that failed:", script.src);
        console.error("[GA Debug] Possible causes: ad blocker, network issue, or CORS");
      };

      document.head.appendChild(script);

      gtag("js", new Date());
      gtag("config", gaId, { send_page_view: false });
      console.log("[GA Debug] gtag configured with consent mode");

      // Expose debug helper to window for manual testing
      (window as any).testGA = () => {
        console.log("=== GA Debug Test ===");
        console.log("1. gtag exists?", typeof window.gtag);
        console.log("2. GA ID:", gaId);
        console.log("3. dataLayer:", window.dataLayer);
        console.log("4. Sending test event...");
        window.gtag?.('event', 'debug_test', {
          event_category: 'debug',
          event_label: 'manual_test',
          value: Date.now()
        });
        console.log("5. Test event sent! Check Network tab for 'collect' request");
        console.log("6. If no request appears, you likely have an ad blocker active");
      };
      console.log("[GA Debug] Test helper available: window.testGA()");
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
