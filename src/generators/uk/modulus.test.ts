import { describe, expect, it } from 'vitest';
import { validateUkAccount } from './modulus';

// Test cases published in the Vocalink "Validating account numbers" specification.
const cases: [string, string, boolean, string][] = [
  ['089999', '66374958', true, 'passes MOD10, MOD11 and DBLAL'],
  ['107999', '88837491', true, 'passes MOD10, MOD11 and DBLAL'],
  ['202959', '63748472', true, 'passes MOD10, MOD11 and DBLAL'],
  ['871427', '46238510', true, 'ex 10 & 11, first passes, second fails'],
  ['872427', '46238510', true, 'ex 10 & 11, both pass'],
  ['871427', '09123496', true, 'ex 10, ab = 09 and g = 9'],
  ['871427', '99123496', true, 'ex 10, ab = 99 and g = 9'],
  ['820000', '73688637', true, 'ex 3, c = 6 so second check ignored'],
  ['827999', '73988638', true, 'ex 3, c = 9 so second check ignored'],
  ['827101', '28748352', true, 'ex 3, both checks run'],
  ['134020', '63849203', true, 'ex 4, remainder equals check digit'],
  ['118765', '64371389', true, 'ex 1, 27 added'],
  ['200915', '41011166', true, 'ex 6, foreign currency account'],
  ['938611', '07806039', true, 'ex 5, both check digits correct'],
  ['938600', '42368003', true, 'ex 5, first remainder 0'],
  ['938063', '55065200', true, 'ex 5, check digits correct'],
  ['772798', '99345694', true, 'ex 7, passes but would fail standard check'],
  ['086090', '06774744', true, 'ex 8, substitute sort code'],
  ['309070', '02355688', true, 'ex 2 & 9, first check passes'],
  ['309070', '12345668', true, 'ex 2 & 9, second check passes with substitution'],
  ['309070', '12345677', true, 'ex 2 & 9, a != 0 and g != 9'],
  ['309070', '99345694', true, 'ex 2 & 9, a != 0 and g = 9'],
  ['938063', '15764273', false, 'ex 5, first check digit incorrect'],
  ['938063', '15764264', false, 'ex 5, second check digit incorrect'],
  ['938063', '15763217', false, 'ex 5, first remainder 1'],
  ['118765', '64371388', false, 'ex 1 fails'],
  ['203099', '66831036', false, 'first passes, DBLAL fails'],
  ['203099', '58716970', false, 'first fails MOD11'],
  ['089999', '66374959', false, 'fails MOD10'],
  ['107999', '88837493', false, 'fails MOD11'],
  ['074456', '12345112', true, 'ex 12 & 13, passes MOD11'],
  ['070116', '34012583', true, 'ex 12 & 13, passes MOD11'],
  ['074456', '11104102', true, 'ex 12 & 13, passes MOD10'],
  ['180002', '00000190', true, 'ex 14, passes after shifting account'],
];

describe('validateUkAccount (Vocalink spec test cases)', () => {
  it.each(cases)('%s %s → %s (%s)', (sortCode, account, expected) => {
    expect(validateUkAccount(sortCode, account).valid).toBe(expected);
  });

  it('treats sort codes outside the table as uncheckable but valid', () => {
    const result = validateUkAccount('000000', '12345678');
    expect(result).toMatchObject({ valid: true, checkable: false });
  });

  it('rejects malformed input', () => {
    expect(validateUkAccount('12-34', '12345678').valid).toBe(false);
    expect(validateUkAccount('123456', '1234').valid).toBe(false);
  });
});
