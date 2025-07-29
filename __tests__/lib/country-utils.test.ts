/**
 * @jest-environment node
 */

import {
  getCountryName,
  normalizeCountryCodeForFlag,
  validateCountryCode,
  generateFlagUrl,
  getLocalFlagPath,
  isCountrySupported
} from '@/lib/country-utils';

describe('Country Utils', () => {
  describe('getCountryName', () => {
    test('returns correct country name for 2-letter codes', () => {
      expect(getCountryName('US')).toBe('United States');
      expect(getCountryName('BR')).toBe('Brazil');
      expect(getCountryName('DE')).toBe('Germany');
    });

    test('returns correct country name for 3-letter codes', () => {
      expect(getCountryName('USA')).toBe('United States');
      expect(getCountryName('BRA')).toBe('Brazil');
      expect(getCountryName('GER')).toBe('Germany');
    });

    test('handles case insensitive input', () => {
      expect(getCountryName('usa')).toBe('United States');
      expect(getCountryName('bra')).toBe('Brazil');
      expect(getCountryName('Ger')).toBe('Germany');
    });

    test('returns original code for unknown countries', () => {
      expect(getCountryName('XYZ')).toBe('XYZ');
      expect(getCountryName('UNKNOWN')).toBe('UNKNOWN');
    });

    test('handles empty and invalid inputs', () => {
      expect(getCountryName('')).toBe('');
      expect(getCountryName(null as any)).toBe('');
      expect(getCountryName(undefined as any)).toBe('');
    });

    test('handles whitespace in country codes', () => {
      expect(getCountryName(' US ')).toBe('United States');
      expect(getCountryName('\tBRA\n')).toBe('Brazil');
    });
  });

  describe('normalizeCountryCodeForFlag', () => {
    test('converts 2-letter codes to lowercase', () => {
      expect(normalizeCountryCodeForFlag('US')).toBe('us');
      expect(normalizeCountryCodeForFlag('BR')).toBe('br');
      expect(normalizeCountryCodeForFlag('DE')).toBe('de');
    });

    test('maps 3-letter codes to 2-letter lowercase', () => {
      expect(normalizeCountryCodeForFlag('USA')).toBe('us');
      expect(normalizeCountryCodeForFlag('BRA')).toBe('br');
      expect(normalizeCountryCodeForFlag('GER')).toBe('de');
      expect(normalizeCountryCodeForFlag('NED')).toBe('nl');
    });

    test('handles case insensitive input', () => {
      expect(normalizeCountryCodeForFlag('usa')).toBe('us');
      expect(normalizeCountryCodeForFlag('Bra')).toBe('br');
      expect(normalizeCountryCodeForFlag('gEr')).toBe('de');
    });

    test('handles unmapped 3-letter codes by taking first 2 characters', () => {
      expect(normalizeCountryCodeForFlag('XYZ')).toBe('xy');
      expect(normalizeCountryCodeForFlag('ABC')).toBe('ab');
    });

    test('handles invalid inputs', () => {
      expect(normalizeCountryCodeForFlag('')).toBe('');
      expect(normalizeCountryCodeForFlag(null as any)).toBe('');
      expect(normalizeCountryCodeForFlag(undefined as any)).toBe('');
    });

    test('handles longer codes by taking first 2 characters', () => {
      expect(normalizeCountryCodeForFlag('ABCDEF')).toBe('ab');
    });

    test('handles whitespace', () => {
      expect(normalizeCountryCodeForFlag(' USA ')).toBe('us');
      expect(normalizeCountryCodeForFlag('\tBRA\n')).toBe('br');
    });
  });

  describe('validateCountryCode', () => {
    test('validates 2-letter codes', () => {
      expect(validateCountryCode('US')).toBe(true);
      expect(validateCountryCode('BR')).toBe(true);
      expect(validateCountryCode('DE')).toBe(true);
    });

    test('validates 3-letter codes', () => {
      expect(validateCountryCode('USA')).toBe(true);
      expect(validateCountryCode('BRA')).toBe(true);
      expect(validateCountryCode('GER')).toBe(true);
    });

    test('accepts case insensitive codes', () => {
      expect(validateCountryCode('us')).toBe(true);
      expect(validateCountryCode('Bra')).toBe(true);
      expect(validateCountryCode('gER')).toBe(true);
    });

    test('rejects invalid codes', () => {
      expect(validateCountryCode('U')).toBe(false); // too short
      expect(validateCountryCode('ABCD')).toBe(false); // too long
      expect(validateCountryCode('U1')).toBe(false); // contains numbers
      expect(validateCountryCode('A-B')).toBe(false); // contains special chars
    });

    test('rejects empty and null inputs', () => {
      expect(validateCountryCode('')).toBe(false);
      expect(validateCountryCode(null as any)).toBe(false);
      expect(validateCountryCode(undefined as any)).toBe(false);
    });

    test('handles whitespace correctly', () => {
      expect(validateCountryCode(' US ')).toBe(true);
      expect(validateCountryCode('US ')).toBe(true);
      expect(validateCountryCode(' US')).toBe(true);
    });
  });

  describe('generateFlagUrl', () => {
    test('generates correct URLs for valid codes', () => {
      expect(generateFlagUrl('US')).toBe('https://flagcdn.com/w20/us.png');
      expect(generateFlagUrl('BRA')).toBe('https://flagcdn.com/w20/br.png');
      expect(generateFlagUrl('GER')).toBe('https://flagcdn.com/w20/de.png');
    });

    test('supports different sizes', () => {
      expect(generateFlagUrl('US', 'w20')).toBe('https://flagcdn.com/w20/us.png');
      expect(generateFlagUrl('US', 'w40')).toBe('https://flagcdn.com/w40/us.png');
      expect(generateFlagUrl('US', 'w80')).toBe('https://flagcdn.com/w80/us.png');
    });

    test('uses default size when not specified', () => {
      expect(generateFlagUrl('US')).toBe('https://flagcdn.com/w20/us.png');
    });

    test('returns empty string for invalid codes', () => {
      expect(generateFlagUrl('')).toBe('');
      expect(generateFlagUrl('INVALID')).toBe('');
      expect(generateFlagUrl('U1')).toBe('');
    });

    test('handles case insensitive input', () => {
      expect(generateFlagUrl('usa')).toBe('https://flagcdn.com/w20/us.png');
      expect(generateFlagUrl('Bra')).toBe('https://flagcdn.com/w20/br.png');
    });
  });

  describe('getLocalFlagPath', () => {
    test('generates correct local paths for valid codes', () => {
      expect(getLocalFlagPath('US')).toBe('/flags/us.png');
      expect(getLocalFlagPath('BRA')).toBe('/flags/br.png');
      expect(getLocalFlagPath('GER')).toBe('/flags/de.png');
    });

    test('returns empty string for invalid codes', () => {
      expect(getLocalFlagPath('')).toBe('');
      expect(getLocalFlagPath('INVALID')).toBe('');
      expect(getLocalFlagPath('U1')).toBe('');
    });

    test('handles case insensitive input', () => {
      expect(getLocalFlagPath('usa')).toBe('/flags/us.png');
      expect(getLocalFlagPath('Bra')).toBe('/flags/br.png');
    });
  });

  describe('isCountrySupported', () => {
    test('returns true for supported countries', () => {
      expect(isCountrySupported('US')).toBe(true);
      expect(isCountrySupported('USA')).toBe(true);
      expect(isCountrySupported('BRA')).toBe(true);
      expect(isCountrySupported('GER')).toBe(true);
    });

    test('returns false for unsupported countries', () => {
      expect(isCountrySupported('XYZ')).toBe(false);
      expect(isCountrySupported('UNKNOWN')).toBe(false);
    });

    test('handles case insensitive input', () => {
      expect(isCountrySupported('usa')).toBe(true);
      expect(isCountrySupported('bra')).toBe(true);
      expect(isCountrySupported('ger')).toBe(true);
    });

    test('returns false for invalid inputs', () => {
      expect(isCountrySupported('')).toBe(false);
      expect(isCountrySupported(null as any)).toBe(false);
      expect(isCountrySupported(undefined as any)).toBe(false);
    });

    test('handles whitespace correctly', () => {
      expect(isCountrySupported(' USA ')).toBe(true);
      expect(isCountrySupported('\tBRA\n')).toBe(true);
    });
  });

  describe('Country Code Mapping', () => {
    test('maps common volleyball country codes correctly', () => {
      const commonMappings = [
        { input: 'BRA', expected: 'br' },
        { input: 'USA', expected: 'us' },
        { input: 'GER', expected: 'de' },
        { input: 'ITA', expected: 'it' },
        { input: 'FRA', expected: 'fr' },
        { input: 'AUS', expected: 'au' },
        { input: 'NED', expected: 'nl' },
        { input: 'CAN', expected: 'ca' },
        { input: 'JPN', expected: 'jp' },
        { input: 'CHN', expected: 'cn' }
      ];

      commonMappings.forEach(({ input, expected }) => {
        expect(normalizeCountryCodeForFlag(input)).toBe(expected);
        expect(generateFlagUrl(input)).toBe(`https://flagcdn.com/w20/${expected}.png`);
      });
    });

    test('supports both 2-letter and 3-letter codes for same country', () => {
      expect(getCountryName('US')).toBe(getCountryName('USA'));
      expect(getCountryName('BR')).toBe(getCountryName('BRA'));
      expect(getCountryName('DE')).toBe(getCountryName('GER'));
    });
  });

  describe('Edge Cases', () => {
    test('handles non-string inputs gracefully', () => {
      const invalidInputs = [null, undefined, 123, {}, [], true];
      
      invalidInputs.forEach(input => {
        expect(getCountryName(input as any)).toBe(input || '');
        expect(normalizeCountryCodeForFlag(input as any)).toBe('');
        expect(validateCountryCode(input as any)).toBe(false);
        expect(generateFlagUrl(input as any)).toBe('');
        expect(getLocalFlagPath(input as any)).toBe('');
        expect(isCountrySupported(input as any)).toBe(false);
      });
    });

    test('handles extremely long strings', () => {
      const longString = 'A'.repeat(1000);
      expect(validateCountryCode(longString)).toBe(false);
      expect(normalizeCountryCodeForFlag(longString)).toBe('aa');
    });

    test('handles special characters', () => {
      expect(validateCountryCode('U$')).toBe(false);
      expect(validateCountryCode('A@B')).toBe(false);
      expect(validateCountryCode('A B')).toBe(false);
    });
  });
});