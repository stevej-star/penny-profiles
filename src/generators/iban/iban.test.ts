import { describe, expect, it } from 'vitest';
import { buildIban, formatIban, validateIban } from './iban';
import { IBAN_COUNTRIES } from './registry';

// Example IBANs from the SWIFT IBAN registry.
const registryExamples = [
  'AD1200012030200359100100', 'AT611904300234573201', 'BE68539007547034', 'BG80BNBG96611020345678',
  'CH9300762011623852957', 'CY17002001280000001200527600', 'CZ6508000000192000145399', 'DE89370400440532013000',
  'DK5000400440116243', 'EE382200221020145685', 'ES9121000418450200051332', 'FI2112345600000785',
  'FR1420041010050500013M02606', 'GB29NWBK60161331926819', 'GI75NWBK000000007099453', 'GR1601101250000000012300695',
  'HR1210010051863000160', 'HU42117730161111101800000000', 'IE29AIBK93115212345678', 'IS140159260076545510730339',
  'IT60X0542811101000000123456', 'LI21088100002324013AA', 'LT121000011101001000', 'LU280019400644750000',
  'LV80BANK0000435195001', 'MC5811222000010123456789030', 'MT84MALT011000012345MTLCAST001S', 'NL91ABNA0417164300',
  'NO9386011117947', 'PL61109010140000071219812874', 'PT50000201231234567890154', 'RO49AAAA1B31007593840000',
  'SE4550000000058398257466', 'SI56263300012039086', 'SK3112000000198742637541', 'SM86U0322509800000000270100',
];

describe('validateIban', () => {
  it.each(registryExamples)('accepts registry example %s', (iban) => {
    expect(validateIban(iban)).toMatchObject({ valid: true });
  });

  it('covers every registry country with an example', () => {
    expect(new Set(registryExamples.map((i) => i.slice(0, 2)))).toEqual(new Set(IBAN_COUNTRIES.map((c) => c.code)));
  });

  it('accepts the printed format', () => {
    expect(validateIban(formatIban('GB29NWBK60161331926819')).valid).toBe(true);
  });

  it('rejects wrong check digits, length and national checks', () => {
    expect(validateIban('GB28NWBK60161331926819').valid).toBe(false);
    expect(validateIban('GB29NWBK6016133192681').valid).toBe(false);
    // Valid mod-97 but wrong RIB key.
    expect(validateIban(buildIban('FR', '20041010050500013M02607')).reason).toMatch(/RIB key/);
  });

  it('extracts bank and branch codes', () => {
    expect(validateIban('ES9121000418450200051332')).toMatchObject({ bankCode: '2100', branchCode: '0418' });
  });
});
