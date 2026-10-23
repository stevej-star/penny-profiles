import ukBanks from '../../data/banks/uk.json';
import type { Rng } from '../../lib/rng';
import { buildIban, formatIban } from '../iban/iban';
import type { Generated } from '../types';
import { validateUkAccount } from './modulus';
import { MODULUS_RULES } from './modulusData';

export interface UkBank {
  id: string;
  name: string;
  bic: string;
  ranges?: string[][];
  sortCodes?: string[];
}

export const UK_BANKS: UkBank[] = ukBanks;

const ownedSortCodes = new Set(UK_BANKS.flatMap((b) => b.sortCodes ?? []));

/**
 * Sort code intervals for a bank that are covered by the modulus table, so every
 * generated account number is genuinely checkable. Codes listed explicitly for
 * other banks (e.g. Starling 60-83-71 inside the NatWest range) are skipped when picking.
 */
export function bankIntervals(bank: UkBank): [number, number][] {
  const out: [number, number][] = [];
  for (const [from, to] of bank.ranges ?? []) {
    for (const rule of MODULUS_RULES) {
      const start = Math.max(rule.start, Number(from));
      const end = Math.min(rule.end, Number(to));
      if (start <= end && !out.some(([s, e]) => s === start && e === end)) out.push([start, end]);
    }
  }
  return out;
}

export function formatSortCode(sc: string): string {
  return `${sc.slice(0, 2)}-${sc.slice(2, 4)}-${sc.slice(4, 6)}`;
}

export function pickSortCode(bank: UkBank, rng: Rng): string {
  if (bank.sortCodes?.length) return rng.pick(bank.sortCodes);
  const intervals = bankIntervals(bank);
  for (let i = 0; i < 100; i++) {
    const [start, end] = rng.pick(intervals);
    const sc = String(rng.int(start, end)).padStart(6, '0');
    if (!ownedSortCodes.has(sc)) return sc;
  }
  throw new Error(`Could not pick a sort code for ${bank.name}`);
}

export function findUkBankForSortCode(sortCode: string): UkBank | undefined {
  const sc = Number(sortCode);
  return (
    UK_BANKS.find((b) => b.sortCodes?.includes(sortCode)) ??
    UK_BANKS.find((b) => b.ranges?.some(([from, to]) => Number(from) <= sc && sc <= Number(to)))
  );
}

export interface UkOptions {
  bankId?: string;
  /** Specific sort code; overrides the bank ranges. */
  sortCode?: string;
  /** Generate an account number that fails modulus checking. */
  invalid?: boolean;
}

export function generateUkAccount(opts: UkOptions, rng: Rng): Generated {
  const bank = UK_BANKS.find((b) => b.id === opts.bankId) ?? rng.pick(UK_BANKS);
  const sortCode = opts.sortCode?.replace(/\D/g, '') || pickSortCode(bank, rng);
  const owner = findUkBankForSortCode(sortCode) ?? bank;

  let account = '';
  let check = validateUkAccount(sortCode, '00000000');
  for (let i = 0; i < 20000; i++) {
    account = rng.digits(8);
    check = validateUkAccount(sortCode, account);
    // An uncheckable sort code accepts anything, so "invalid" can't be honoured; stop at once.
    if (check.valid !== Boolean(opts.invalid) || !check.checkable) break;
  }

  const iban = buildIban('GB', owner.bic.slice(0, 4) + sortCode + account);
  return {
    title: `${owner.name} · ${formatSortCode(sortCode)}`,
    fields: [
      { label: 'Bank', value: owner.name },
      { label: 'Sort code', value: formatSortCode(sortCode), copy: sortCode, scope: 'local' },
      { label: 'Account number', value: account },
      { label: 'BIC', value: owner.bic, scope: 'intl' },
      { label: 'IBAN', value: formatIban(iban), copy: iban, scope: 'intl' },
      { label: 'Modulus check', value: check.methods.join(' + ') || 'Not in table', scope: 'local' },
    ],
    data: { bank: owner.name, sortCode, accountNumber: account, bic: owner.bic, iban },
    check: { valid: check.valid, reason: check.reason },
  };
}
