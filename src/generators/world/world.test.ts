import { describe, expect, it } from 'vitest';
import { createRng } from '../../lib/rng';
import { WORLD_BANKS, WORLD_COUNTRIES, generateWorldAccount, luhnCheckDigit, russianAccountKey, validateChinaCard, validateRussianAccount } from './world';

describe('Russia', () => {
  it.each(WORLD_BANKS.RU.map((b) => [b.name, b] as const))('%s correspondent account matches its BIK', (_, bank) => {
    expect(bank.corrAccount!.endsWith(bank.code.slice(-3))).toBe(true);
    expect(validateRussianAccount(bank.code, bank.corrAccount!).valid).toBe(true);
  });

  it('rejects an account whose control key was changed', () => {
    const draft = '40817810X12345678901';
    const key = russianAccountKey('044525225', draft.replace('X', '0'));
    expect(validateRussianAccount('044525225', draft.replace('X', key)).valid).toBe(true);
    expect(validateRussianAccount('044525225', draft.replace('X', String((Number(key) + 1) % 10))).valid).toBe(false);
  });
});

describe('China', () => {
  it('Luhn check digit matches a known test card', () => {
    // Standard Luhn example.
    expect(luhnCheckDigit('7992739871')).toBe('3');
  });

  it('rejects a bad check digit', () => {
    const card = '6222020000000000000';
    const good = card.slice(0, -1) + luhnCheckDigit(card.slice(0, -1));
    expect(validateChinaCard(good).valid).toBe(true);
    expect(validateChinaCard(good.slice(0, -1) + ((Number(good.slice(-1)) + 1) % 10)).valid).toBe(false);
  });
});

describe('generateWorldAccount', () => {
  it.each(WORLD_COUNTRIES.map((c) => c.code))('%s accounts are valid, and invalid ones fail where a checksum exists', (code) => {
    const rng = createRng(9);
    const country = WORLD_COUNTRIES.find((c) => c.code === code)!;
    for (let i = 0; i < 500; i++) {
      const bank = rng.pick(WORLD_BANKS[code]);
      const accountType = country.accountTypes ? rng.pick(country.accountTypes).value : undefined;
      const currency = country.currencies ? rng.pick(country.currencies) : undefined;
      const good = generateWorldAccount(code, { bankId: bank.id, accountType, currency }, rng);
      expect(good.check.valid, JSON.stringify(good.data)).toBe(true);
      expect(good.data.bic).toBe(bank.bic);
      if (code === 'RU') expect(validateRussianAccount(good.data.bik, good.data.accountNumber).valid).toBe(true);
      if (code === 'CN') expect(validateChinaCard(good.data.accountNumber).valid).toBe(true);
      if (country.hasChecksum) {
        expect(generateWorldAccount(code, { bankId: bank.id, invalid: true }, rng).check.valid).toBe(false);
      }
    }
  });

  it('builds Australian BSBs from the bank prefix', () => {
    const rng = createRng(4);
    for (const bank of WORLD_BANKS.AU) {
      const { data } = generateWorldAccount('AU', { bankId: bank.id }, rng);
      expect(data.bsb).toMatch(/^\d{6}$/);
      expect(data.bsb.startsWith(bank.code)).toBe(true);
      expect('234567').toContain(data.bsb[2]);
      expect(data.accountNumber).toHaveLength(bank.accountLength!);
    }
  });

  it('formats Canadian routing numbers', () => {
    const { data } = generateWorldAccount('CA', { bankId: 'rbc' }, createRng(1));
    expect(data.eftRouting).toMatch(/^0003\d{5}$/);
    expect(data.clearingCode).toBe(`//CC${data.eftRouting}`);
    expect(data.accountNumber).toMatch(/^\d{7}$/);
  });

  it('derives Japan Post Bank transfer details from the passbook numbers', () => {
    const { data } = generateWorldAccount('JP', { bankId: 'jpbank' }, createRng(2));
    expect(data.kigou).toMatch(/^1\d{3}0$/);
    expect(data.bangou).toMatch(/^\d{7}1$/);
    expect(data.branchCode).toBe(`${data.kigou.slice(1, 3)}8`);
    expect(data.accountNumber).toBe(data.bangou.slice(0, 7));
  });

  it('every bank BIC belongs to its country', () => {
    for (const [code, banks] of Object.entries(WORLD_BANKS)) {
      for (const b of banks) expect(b.bic.slice(4, 6), b.name).toBe(code);
    }
  });
});
