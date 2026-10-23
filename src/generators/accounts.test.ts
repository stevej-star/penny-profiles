import { describe, expect, it } from 'vitest';
import { createRng } from '../lib/rng';
import { validateIban } from './iban/iban';
import { IBAN_BANKS, generateIban } from './iban/ibanAccount';
import { IBAN_COUNTRIES, IBAN_COUNTRY_BY_CODE, bbanRegex } from './iban/registry';
import { findRules, validateUkAccount } from './uk/modulus';
import { UK_BANKS, bankIntervals, generateUkAccount } from './uk/ukAccount';
import { US_BANKS, abaChecksumOk, generateUsAccount } from './us/aba';

const RUNS = 1000;

describe('bundled bank data', () => {
  it.each(UK_BANKS.map((b) => [b.name, b] as const))('%s sort codes are covered by the modulus table', (_, bank) => {
    for (const sc of bank.sortCodes ?? []) expect(findRules(sc).length).toBeGreaterThan(0);
    if (bank.ranges) expect(bankIntervals(bank).length).toBeGreaterThan(0);
  });

  it('every US routing number passes the ABA checksum', () => {
    for (const bank of US_BANKS) {
      for (const r of bank.routingNumbers) expect(abaChecksumOk(r.number), `${bank.name} ${r.number}`).toBe(true);
    }
  });

  it('every IBAN bank code and BIC fits its country', () => {
    for (const [code, banks] of Object.entries(IBAN_BANKS)) {
      const country = IBAN_COUNTRY_BY_CODE.get(code)!;
      expect(country, code).toBeDefined();
      for (const bank of banks) {
        for (const bc of bank.bankCodes) expect(bc.length, `${bank.name} ${bc}`).toBeLessThanOrEqual(country.bank[1]);
        expect(bank.bic).toMatch(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/);
        expect(bank.bic.slice(4, 6), `${bank.name} BIC country`).toBe(code);
      }
    }
  });
});

describe('generators produce values their validators accept', () => {
  it('UK accounts pass modulus checking, and invalid ones fail', () => {
    const rng = createRng(1);
    for (let i = 0; i < RUNS; i++) {
      const bank = rng.pick(UK_BANKS);
      const good = generateUkAccount({ bankId: bank.id }, rng);
      expect(validateUkAccount(good.data.sortCode, good.data.accountNumber), JSON.stringify(good.data)).toMatchObject({
        valid: true,
        checkable: true,
      });
      expect(validateIban(good.data.iban).valid).toBe(true);
      const bad = generateUkAccount({ bankId: bank.id, invalid: true }, rng);
      expect(validateUkAccount(bad.data.sortCode, bad.data.accountNumber).valid, JSON.stringify(bad.data)).toBe(false);
    }
  });

  it('US accounts have valid routing numbers and in-range account lengths', () => {
    const rng = createRng(2);
    for (let i = 0; i < RUNS; i++) {
      const bank = rng.pick(US_BANKS);
      const acct = generateUsAccount({ bankId: bank.id }, rng);
      expect(abaChecksumOk(acct.data.routingNumber)).toBe(true);
      expect(acct.data.accountNumber.length).toBeGreaterThanOrEqual(bank.accountLength[0]);
      expect(acct.data.accountNumber.length).toBeLessThanOrEqual(bank.accountLength[1]);
      expect(abaChecksumOk(generateUsAccount({ bankId: bank.id, invalid: true }, rng).data.routingNumber)).toBe(false);
    }
  });

  it.each(IBAN_COUNTRIES.map((c) => c.code))('%s IBANs validate (random and bundled banks)', (code) => {
    const rng = createRng(3);
    const country = IBAN_COUNTRY_BY_CODE.get(code)!;
    for (let i = 0; i < RUNS / 10; i++) {
      const bankName = i % 2 ? 'any' : undefined;
      const { data } = generateIban({ country: code, bankName }, rng);
      expect(validateIban(data.iban), data.iban).toMatchObject({ valid: true });
      expect(bbanRegex(country.bban).test(data.bban)).toBe(true);
      expect(validateIban(generateIban({ country: code, bankName, invalid: true }, rng).data.iban).valid).toBe(false);
    }
  });

  it('is reproducible from a seed', () => {
    expect(generateUkAccount({}, createRng(42)).data).toEqual(generateUkAccount({}, createRng(42)).data);
  });
});
