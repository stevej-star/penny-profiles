/**
 * BBAN structures from the SWIFT IBAN registry, in SWIFT notation:
 * n = digits, a = upper-case letters, c = alphanumeric. Bank and branch
 * identifiers are given as [offset, length] within the BBAN.
 */
export interface IbanCountry {
  code: string;
  name: string;
  currency: string;
  length: number;
  bban: string;
  bank: [number, number];
  branch?: [number, number];
  sepa: boolean;
}

export const IBAN_COUNTRIES: IbanCountry[] = [
  { code: 'AD', name: 'Andorra', currency: 'EUR', length: 24, bban: '4n4n12c', bank: [0, 4], branch: [4, 4], sepa: true },
  { code: 'AT', name: 'Austria', currency: 'EUR', length: 20, bban: '5n11n', bank: [0, 5], sepa: true },
  { code: 'BE', name: 'Belgium', currency: 'EUR', length: 16, bban: '3n7n2n', bank: [0, 3], sepa: true },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN', length: 22, bban: '4a4n2n8c', bank: [0, 4], branch: [4, 4], sepa: true },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', length: 21, bban: '5n12c', bank: [0, 5], sepa: true },
  { code: 'CY', name: 'Cyprus', currency: 'EUR', length: 28, bban: '3n5n16c', bank: [0, 3], branch: [3, 5], sepa: true },
  { code: 'CZ', name: 'Czechia', currency: 'CZK', length: 24, bban: '4n6n10n', bank: [0, 4], sepa: true },
  { code: 'DE', name: 'Germany', currency: 'EUR', length: 22, bban: '8n10n', bank: [0, 8], sepa: true },
  { code: 'DK', name: 'Denmark', currency: 'DKK', length: 18, bban: '4n9n1n', bank: [0, 4], sepa: true },
  { code: 'EE', name: 'Estonia', currency: 'EUR', length: 20, bban: '2n2n11n1n', bank: [0, 2], sepa: true },
  { code: 'ES', name: 'Spain', currency: 'EUR', length: 24, bban: '4n4n1n1n10n', bank: [0, 4], branch: [4, 4], sepa: true },
  { code: 'FI', name: 'Finland', currency: 'EUR', length: 18, bban: '3n11n', bank: [0, 3], sepa: true },
  { code: 'FR', name: 'France', currency: 'EUR', length: 27, bban: '5n5n11c2n', bank: [0, 5], branch: [5, 5], sepa: true },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', length: 22, bban: '4a6n8n', bank: [0, 4], branch: [4, 6], sepa: true },
  { code: 'GI', name: 'Gibraltar', currency: 'GIP', length: 23, bban: '4a15c', bank: [0, 4], sepa: true },
  { code: 'GR', name: 'Greece', currency: 'EUR', length: 27, bban: '3n4n16c', bank: [0, 3], branch: [3, 4], sepa: true },
  { code: 'HR', name: 'Croatia', currency: 'EUR', length: 21, bban: '7n10n', bank: [0, 7], sepa: true },
  { code: 'HU', name: 'Hungary', currency: 'HUF', length: 28, bban: '3n4n1n15n1n', bank: [0, 3], branch: [3, 4], sepa: true },
  { code: 'IE', name: 'Ireland', currency: 'EUR', length: 22, bban: '4a6n8n', bank: [0, 4], branch: [4, 6], sepa: true },
  { code: 'IS', name: 'Iceland', currency: 'ISK', length: 26, bban: '4n2n6n10n', bank: [0, 4], sepa: true },
  { code: 'IT', name: 'Italy', currency: 'EUR', length: 27, bban: '1a5n5n12c', bank: [1, 5], branch: [6, 5], sepa: true },
  { code: 'LI', name: 'Liechtenstein', currency: 'CHF', length: 21, bban: '5n12c', bank: [0, 5], sepa: true },
  { code: 'LT', name: 'Lithuania', currency: 'EUR', length: 20, bban: '5n11n', bank: [0, 5], sepa: true },
  { code: 'LU', name: 'Luxembourg', currency: 'EUR', length: 20, bban: '3n13c', bank: [0, 3], sepa: true },
  { code: 'LV', name: 'Latvia', currency: 'EUR', length: 21, bban: '4a13c', bank: [0, 4], sepa: true },
  { code: 'MC', name: 'Monaco', currency: 'EUR', length: 27, bban: '5n5n11c2n', bank: [0, 5], branch: [5, 5], sepa: true },
  { code: 'MT', name: 'Malta', currency: 'EUR', length: 31, bban: '4a5n18c', bank: [0, 4], branch: [4, 5], sepa: true },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', length: 18, bban: '4a10n', bank: [0, 4], sepa: true },
  { code: 'NO', name: 'Norway', currency: 'NOK', length: 15, bban: '4n6n1n', bank: [0, 4], sepa: true },
  { code: 'PL', name: 'Poland', currency: 'PLN', length: 28, bban: '8n16n', bank: [0, 8], sepa: true },
  { code: 'PT', name: 'Portugal', currency: 'EUR', length: 25, bban: '4n4n11n2n', bank: [0, 4], branch: [4, 4], sepa: true },
  { code: 'RO', name: 'Romania', currency: 'RON', length: 24, bban: '4a16c', bank: [0, 4], sepa: true },
  { code: 'SE', name: 'Sweden', currency: 'SEK', length: 24, bban: '3n16n1n', bank: [0, 3], sepa: true },
  { code: 'SI', name: 'Slovenia', currency: 'EUR', length: 19, bban: '5n8n2n', bank: [0, 5], sepa: true },
  { code: 'SK', name: 'Slovakia', currency: 'EUR', length: 24, bban: '4n6n10n', bank: [0, 4], sepa: true },
  { code: 'SM', name: 'San Marino', currency: 'EUR', length: 27, bban: '1a5n5n12c', bank: [1, 5], branch: [6, 5], sepa: true },
];

export const IBAN_COUNTRY_BY_CODE = new Map(IBAN_COUNTRIES.map((c) => [c.code, c]));

/** Expand '4n4n12c' into a per-character class list. */
export function expandBban(spec: string): ('n' | 'a' | 'c')[] {
  const out: ('n' | 'a' | 'c')[] = [];
  for (const [, count, kind] of spec.matchAll(/(\d+)([nac])/g)) {
    for (let i = 0; i < Number(count); i++) out.push(kind as 'n' | 'a' | 'c');
  }
  return out;
}

export function bbanRegex(spec: string): RegExp {
  const parts = [...spec.matchAll(/(\d+)([nac])/g)].map(
    ([, count, kind]) => `${{ n: '\\d', a: '[A-Z]', c: '[A-Z0-9]' }[kind]}{${count}}`,
  );
  return new RegExp(`^${parts.join('')}$`);
}
