export {}

declare global {
  interface Window {
    dataLayer?: IArguments[]
    gtag?: (...args: unknown[]) => void
    __ga4?: {
      measurementId?: string
      initialized?: boolean
      consentSet?: boolean
    }
  }
}
