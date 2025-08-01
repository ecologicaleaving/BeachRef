/**
 * Utility functions for URL parameter handling and navigation state preservation
 */

/**
 * Builds a return URL with preserved filter state from search parameters
 * @param searchParams - The current URL search parameters
 * @returns A URL string with preserved filter state
 */
export function buildReturnUrl(searchParams: URLSearchParams): string {
  const params = new URLSearchParams()
  
  // Define the parameters we want to preserve
  const preservedParams = ['year', 'page', 'gender', 'type', 'limit']
  
  // Preserve existing parameters
  preservedParams.forEach(key => {
    const value = searchParams.get(key)
    if (value) {
      params.set(key, value)
    }
  })
  
  return params.toString() ? `/?${params.toString()}` : '/'
}

/**
 * Gets the current year from search parameters with fallback
 * @param searchParams - The current URL search parameters
 * @returns The year as a string
 */
export function getCurrentYear(searchParams: URLSearchParams): string {
  return searchParams.get('year') || new Date().getFullYear().toString()
}