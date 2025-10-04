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

    // Only run on web platform with valid GA ID
    if (!gaId || typeof window === "undefined") return;

    // Initialize gtag if not already loaded
    if (!window.gtag) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      function gtag(...args: any[]) {
        (window.dataLayer as any).push(args);
      }
      (window as any).gtag = gtag;
      gtag("js", new Date());
      gtag("config", gaId, { send_page_view: false });
    }

    // Send page_view event on pathname change
    if (window.gtag) {
      console.log("Invio page_view con ID:", gaId, "path:", pathname);
      window.gtag("event", "page_view", {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
        debug_mode: true,
      });
    }
  }, [pathname]);
}
