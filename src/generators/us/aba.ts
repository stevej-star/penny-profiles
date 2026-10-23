import usBanks from '../../data/banks/us.json';
import type { Rng } from '../../lib/rng';
import type { Generated } from '../types';

export interface UsBank {
  id: string;
  name: string;
  bic?: string;
  accountLength: number[];
  routingNumbers: { number: string; region: string }[];
}

export const US_BANKS: UsBank[] = usBanks;

const ABA_WEIGHTS = [3, 7, 1, 3, 7, 1, 3, 7, 1];

export function abaChecksumOk(routing: string): boolean {
  if (!/^\d{9}$/.test(routing)) return false;
  return routing.split('').reduce((s, ch, i) => s + Number(ch) * ABA_WEIGHTS[i], 0) % 10 === 0;
}

export function validateRoutingNumber(input: string): { valid: boolean; reason: string; bank?: string } {
  const routing = input.replace(/\D/g, '');
  if (routing.length !== 9) return { valid: false, reason: 'Routing numbers are 9 digits' };
  if (!abaChecksumOk(routing)) return { valid: false, reason: 'ABA checksum (3-7-1 weights) fails' };
  const bank = US_BANKS.find((b) => b.routingNumbers.some((r) => r.number === routing));
  return {
    valid: true,
    reason: bank ? `Checksum OK; known ${bank.name} routing number` : 'Checksum OK (not in the bundled bank list)',
    bank: bank?.name,
  };
}

export interface UsOptions {
  bankId?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
  /** Produce a routing number with a broken checksum. */
  invalid?: boolean;
}

export function generateUsAccount(opts: UsOptions, rng: Rng): Generated {
  const bank = US_BANKS.find((b) => b.id === opts.bankId) ?? rng.pick(US_BANKS);
  const routing = bank.routingNumbers.find((r) => r.number === opts.routingNumber) ?? rng.pick(bank.routingNumbers);
  let routingNumber = routing.number;
  if (opts.invalid) {
    routingNumber = routingNumber.slice(0, 8) + ((Number(routingNumber[8]) + rng.int(1, 9)) % 10);
  }
  const [min, max] = bank.accountLength;
  const accountNumber = String(rng.int(1, 9)) + rng.digits(rng.int(min, max) - 1);
  const accountType = opts.accountType ?? rng.pick(['checking', 'savings'] as const);
  const check = validateRoutingNumber(routingNumber);

  return {
    title: `${bank.name} · ${routing.region}`,
    fields: [
      { label: 'Bank', value: bank.name },
      { label: 'Routing number (ABA)', value: routingNumber, scope: 'local' },
      { label: 'Account number', value: accountNumber },
      { label: 'Account type', value: accountType },
      { label: 'Routing region', value: routing.region, scope: 'local' },
      { label: 'Fedwire routing (field 57)', value: `//FW${routingNumber}`, scope: 'intl' },
      ...(bank.bic ? [{ label: 'SWIFT / BIC', value: bank.bic, scope: 'intl' as const }] : []),
    ],
    data: { bank: bank.name, routingNumber, accountNumber, accountType, bic: bank.bic ?? '' },
    check: { valid: check.valid, reason: check.reason },
  };
}
