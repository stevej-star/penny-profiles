import ibanBanks from '../../data/banks/iban.json';
import type { Rng } from '../../lib/rng';
import type { Generated } from '../types';
import { buildIban, formatIban, validateIban } from './iban';
import { NATIONAL_CHECKS } from './national';
import { IBAN_COUNTRY_BY_CODE, expandBban } from './registry';

export interface IbanBank {
  name: string;
  bic: string;
  /** Full bank code, or a prefix that is padded with random digits. */
  bankCodes: string[];
  /** Prefix for the branch identifier (e.g. Irish sort codes). */
  branchPrefix?: string;
}

export const IBAN_BANKS: Record<string, IbanBank[]> = ibanBanks;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface IbanOptions {
  country: string;
  /** Bank name from the bundled list, or "any" for a random bundled bank; omitted means a random bank code. */
  bankName?: string;
  /** Generate an IBAN with wrong check digits. */
  invalid?: boolean;
}

function randomChars(classes: ('n' | 'a' | 'c')[], rng: Rng): string[] {
  return classes.map((k) => (k === 'a' ? rng.pick([...LETTERS]) : String(rng.int(0, 9))));
}

export function generateIban(opts: IbanOptions, rng: Rng): Generated {
  const country = IBAN_COUNTRY_BY_CODE.get(opts.country);
  if (!country) throw new Error(`Unsupported IBAN country ${opts.country}`);
  const banks = IBAN_BANKS[country.code] ?? [];
  const bank =
    opts.bankName === undefined || banks.length === 0
      ? undefined
      : (banks.find((b) => b.name === opts.bankName) ?? rng.pick(banks));
  const bankCode = bank ? rng.pick(bank.bankCodes) : '';
  const national = NATIONAL_CHECKS[country.code];

  let bban: string | null = null;
  for (let i = 0; i < 1000 && bban === null; i++) {
    const chars = randomChars(expandBban(country.bban), rng);
    chars.splice(country.bank[0], bankCode.length, ...bankCode);
    if (country.branch && bank?.branchPrefix) {
      chars.splice(country.branch[0], bank.branchPrefix.length, ...bank.branchPrefix);
    }
    bban = national ? national.apply(chars.join('')) : chars.join('');
  }
  if (bban === null) throw new Error(`Could not build a ${country.name} BBAN`);

  let iban = buildIban(country.code, bban);
  if (opts.invalid) {
    // Any other value in 02–98; 00/01 would be congruent to 97/98 and still pass.
    const wrong = String(2 + ((Number(iban.slice(2, 4)) - 2 + rng.int(1, 96)) % 97)).padStart(2, '0');
    iban = iban.slice(0, 2) + wrong + iban.slice(4);
  }
  const check = validateIban(iban);
  const bankName = bank?.name ?? 'Random bank code';

  return {
    title: `${country.name} · ${bankName}`,
    fields: [
      { label: 'Country', value: `${country.name} (${country.currency})` },
      { label: 'Bank', value: bankName },
      { label: 'IBAN', value: formatIban(iban), copy: iban },
      { label: 'BBAN', value: bban, scope: 'local' },
      { label: 'Bank code', value: bban.substr(...country.bank), scope: 'local' },
      ...(country.branch ? [{ label: 'Branch code', value: bban.substr(...country.branch), scope: 'local' as const }] : []),
      ...(bank ? [{ label: 'BIC', value: bank.bic, scope: 'intl' as const }] : []),
      ...(national ? [{ label: 'National check', value: national.name, scope: 'local' as const }] : []),
    ],
    data: { country: country.code, bank: bankName, iban, bban, bic: bank?.bic ?? '' },
    check: { valid: check.valid, reason: check.reason },
  };
}
