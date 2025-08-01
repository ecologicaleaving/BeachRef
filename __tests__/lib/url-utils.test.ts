import { buildReturnUrl, getCurrentYear } from '@/lib/url-utils'

describe('url-utils', () => {
  describe('buildReturnUrl', () => {
    it('returns root path when no parameters', () => {
      const searchParams = new URLSearchParams()
      expect(buildReturnUrl(searchParams)).toBe('/')
    })

    it('preserves year parameter', () => {
      const searchParams = new URLSearchParams('year=2024')
      expect(buildReturnUrl(searchParams)).toBe('/?year=2024')
    })

    it('preserves multiple parameters', () => {
      const searchParams = new URLSearchParams('year=2024&page=3&gender=women&type=4star')
      expect(buildReturnUrl(searchParams)).toBe('/?year=2024&page=3&gender=women&type=4star')
    })

    it('ignores unknown parameters', () => {
      const searchParams = new URLSearchParams('year=2024&unknown=value&page=2')
      expect(buildReturnUrl(searchParams)).toBe('/?year=2024&page=2')
    })

    it('handles empty parameter values', () => {
      const searchParams = new URLSearchParams('year=2024&page=&gender=women')
      expect(buildReturnUrl(searchParams)).toBe('/?year=2024&gender=women')
    })
  })

  describe('getCurrentYear', () => {
    it('returns current year when no year parameter', () => {
      const searchParams = new URLSearchParams()
      const currentYear = new Date().getFullYear().toString()
      expect(getCurrentYear(searchParams)).toBe(currentYear)
    })

    it('returns year from search parameters', () => {
      const searchParams = new URLSearchParams('year=2023')
      expect(getCurrentYear(searchParams)).toBe('2023')
    })

    it('returns current year when year parameter is empty', () => {
      const searchParams = new URLSearchParams('year=')
      const currentYear = new Date().getFullYear().toString()
      expect(getCurrentYear(searchParams)).toBe(currentYear)
    })
  })
})