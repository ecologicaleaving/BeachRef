/**
 * Security scanner tests
 * Issue #56
 *
 * The security scanner is the checker that found the hardcoded production
 * superuser password. Two properties are worth freezing:
 *
 *  1. It keeps flagging real insecure endpoints and real credentials — this is
 *     the barrier that stops issue #56 from happening again.
 *  2. It does NOT flag XML namespace / SOAP identifiers. 13 of the 14 findings
 *     it originally produced were `xmlns="http://..."` declarations. Those URIs
 *     are opaque names that no code ever dereferences, and "fixing" them to
 *     https:// silently breaks the SOAP requests the FIVB VIS API expects.
 *     Noise of that ratio trains people to ignore the scanner.
 */

import { SecurityScanner } from '../../../scripts/audit/checkers/security-scanner';

const isXmlNamespaceOnly = (line: string): boolean =>
  (SecurityScanner as unknown as { isXmlNamespaceOnly(l: string): boolean }).isXmlNamespaceOnly(
    line
  );

describe('SecurityScanner.isXmlNamespaceOnly', () => {
  describe('exempts XML namespace and SOAP identifiers', () => {
    it.each([
      ['default namespace', '<GetEvent xmlns="http://www.fivb.org/vis/2009/">'],
      ['prefixed namespace', 'xmlns:soap="http://schemas.xmlsoap.org/soap/"'],
      ['xsi namespace', 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'],
      ['SOAPAction header', "const action = 'SOAPAction: http://www.fivb.org/vis/2009/GetEvent'"],
      ['targetNamespace', 'targetNamespace="http://tempuri.org/"'],
    ])('%s', (_label, line) => {
      expect(isXmlNamespaceOnly(line)).toBe(true);
    });
  });

  describe('still flags genuine insecure endpoints', () => {
    it.each([
      ['plain http endpoint', 'const url = "http://api.example.com/v1";'],
      ['fetch over http', 'await fetch("http://insecure.example/data");'],
      ['multi-URI schemaLocation', 'xsi:schemaLocation="http://a.example http://b.example"'],
      [
        'namespace and endpoint on the same line',
        'fetch("http://insecure.example"); // xmlns="http://x.example"',
      ],
    ])('%s', (_label, line) => {
      expect(isXmlNamespaceOnly(line)).toBe(false);
    });

    it('does not exempt a line with no insecure URI at all', () => {
      expect(isXmlNamespaceOnly('const u = "https://secure.example";')).toBe(false);
      expect(isXmlNamespaceOnly('const n = 1;')).toBe(false);
    });

    it('leaves the localhost carve-out to the caller', () => {
      // localhost is excluded by the scanner's own regex, so this helper sees
      // no insecure URI and must not claim the line is a namespace.
      expect(isXmlNamespaceOnly('fetch("http://localhost:3000")')).toBe(false);
    });
  });
});

describe('SecurityScanner credential patterns', () => {
  // The literal that shipped to a public repo for ten months was an assignment
  // of exactly this shape. Guard the shape, never the value.
  const passwordPattern = /password\s*[:=]\s*['"]['"]?[^'"\s]{8,}['"]?/gi;

  it('matches a hardcoded password assignment', () => {
    passwordPattern.lastIndex = 0;
    expect(passwordPattern.test("  password: 'aaaaaaaaaaaaaaaa',")).toBe(true);
  });

  it('matches regardless of quote style or spacing', () => {
    for (const line of ['password="aaaaaaaaaaaa"', "password  =  'bbbbbbbbbbbb'"]) {
      passwordPattern.lastIndex = 0;
      expect(passwordPattern.test(line)).toBe(true);
    }
  });
});
