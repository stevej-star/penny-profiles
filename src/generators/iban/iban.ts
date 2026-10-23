import { IBAN_COUNTRY_BY_CODE, bbanRegex } from './registry';
import { NATIONAL_CHECKS } from './national';

/** Mod-97 of a numeric string of any length, processed in chunks. */
export function mod97(numeric: string): number {
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    remainder = Number(String(remainder) + numeric.slice(i, i + 7)) % 97;
  }
  return remainder;
}

/** Letters to numbers as per ISO 13616 (A=10 … Z=35). */
export function toNumeric(s: string): string {
  return s.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
}

export function ibanCheckDigits(country: string, bban: string): string {
  const remainder = mod97(toNumeric(bban + country + '00'));
  return String(98 - remainder).padStart(2, '0');
}

export function buildIban(country: string, bban: string): string {
  return country + ibanCheckDigits(country, bban) + bban;
}

export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

export function electronicIban(input: string): string {
  return input.replace(/\s/g, '').toUpperCase();
}

export interface IbanValidation {
  valid: boolean;
  reason: string;
  country?: string;
  bankCode?: string;
  branchCode?: string;
  nationalCheck?: string;
}

export function validateIban(input: string): IbanValidation {
  const iban = electronicIban(input);
  const countryCode = iban.slice(0, 2);
  const country = IBAN_COUNTRY_BY_CODE.get(countryCode);
  if (!country) return { valid: false, reason: `Unsupported or unknown country code "${countryCode}"` };
  if (iban.length !== country.length) {
    return { valid: false, reason: `${country.name} IBANs are ${country.length} characters, got ${iban.length}` };
  }
  const bban = iban.slice(4);
  if (!bbanRegex(country.bban).test(bban)) {
    return { valid: false, reason: `BBAN does not match the ${country.name} format (${country.bban})` };
  }
  const details = {
    country: country.name,
    bankCode: bban.substr(...country.bank),
    branchCode: country.branch ? bban.substr(...country.branch) : undefined,
  };
  if (mod97(toNumeric(bban + iban.slice(0, 4))) !== 1) {
    return { valid: false, reason: 'IBAN check digits are wrong (mod-97 ≠ 1)', ...details };
  }
  const national = NATIONAL_CHECKS[countryCode];
  if (national && !national.validate(bban)) {
    return { valid: false, reason: `IBAN check digits OK, but the ${national.name} is wrong`, ...details };
  }
  return {
    valid: true,
    reason: national ? `Valid: IBAN check digits and ${national.name} both pass` : 'Valid: IBAN check digits pass',
    nationalCheck: national?.name,
    ...details,
  };
}
