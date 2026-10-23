/**
 * National check digits embedded in the BBAN. Each `apply` takes a BBAN whose
 * check-digit positions hold placeholders and returns it with correct check
 * digits, or null when no valid check digit exists for that number.
 */
export interface NationalCheck {
  name: string;
  apply(bban: string): string | null;
  validate(bban: string): boolean;
}

const sumDigits = (n: number) => String(n).split('').reduce((a, b) => a + Number(b), 0);

function bigMod(numeric: string, m: number): number {
  let r = 0;
  for (const ch of numeric) r = (r * 10 + Number(ch)) % m;
  return r;
}

// France / Monaco: RIB key over bank (5) + branch (5) + account (11).
const ribLetter = (ch: string) => {
  if (/\d/.test(ch)) return ch;
  const i = ch.charCodeAt(0) - 65;
  return String([1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9][i]);
};
const ribKey = (body: string) => {
  const n = body.split('').map(ribLetter).join('');
  return String(97 - ((89 * Number(n.slice(0, 5)) + 15 * Number(n.slice(5, 10)) + 3 * Number(n.slice(10, 21))) % 97)).padStart(2, '0');
};
const rib: NationalCheck = {
  name: 'RIB key',
  apply: (b) => b.slice(0, 21) + ribKey(b.slice(0, 21)),
  validate: (b) => ribKey(b.slice(0, 21)) === b.slice(21, 23),
};

// Spain: two "dígitos de control" at BBAN positions 8–9.
const esWeights = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6];
const esDigit = (ten: string) => {
  const d = 11 - (ten.split('').reduce((s, ch, i) => s + Number(ch) * esWeights[i], 0) % 11);
  return String(d === 11 ? 0 : d === 10 ? 1 : d);
};
const esDc = (b: string) => esDigit('00' + b.slice(0, 8)) + esDigit(b.slice(10, 20));
const es: NationalCheck = {
  name: 'Spanish control digits (DC)',
  apply: (b) => b.slice(0, 8) + esDc(b) + b.slice(10),
  validate: (b) => esDc(b) === b.slice(8, 10),
};

// Italy / San Marino: CIN letter at BBAN position 0, over ABI + CAB + account.
const cinOdd = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];
const cin = (body: string) => {
  const total = body.split('').reduce((s, ch, i) => {
    const v = /\d/.test(ch) ? Number(ch) : ch.charCodeAt(0) - 65;
    return s + (i % 2 === 0 ? cinOdd[v] : v);
  }, 0);
  return String.fromCharCode(65 + (total % 26));
};
const it: NationalCheck = {
  name: 'CIN check character',
  apply: (b) => cin(b.slice(1)) + b.slice(1),
  validate: (b) => cin(b.slice(1)) === b[0],
};

// Belgium: last two digits are the first 10 digits mod 97 (00 → 97).
const beCheck = (b: string) => String(Number(b.slice(0, 10)) % 97 || 97).padStart(2, '0');
const be: NationalCheck = {
  name: 'Belgian mod-97 check',
  apply: (b) => b.slice(0, 10) + beCheck(b),
  validate: (b) => beCheck(b) === b.slice(10, 12),
};

// Norway: mod-11 check digit over the first 10 digits.
const noWeights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const noCheck = (b: string) => {
  const r = b.slice(0, 10).split('').reduce((s, ch, i) => s + Number(ch) * noWeights[i], 0) % 11;
  return r === 0 ? '0' : r === 1 ? null : String(11 - r);
};
const no: NationalCheck = {
  name: 'Norwegian mod-11 check',
  apply: (b) => {
    const c = noCheck(b);
    return c === null ? null : b.slice(0, 10) + c;
  },
  validate: (b) => noCheck(b) === b[10],
};

// Portugal: NIB check digits, 98 − (first 19 digits × 100 mod 97).
const ptCheck = (b: string) => String(98 - bigMod(b.slice(0, 19) + '00', 97)).padStart(2, '0');
const pt: NationalCheck = {
  name: 'Portuguese NIB check',
  apply: (b) => b.slice(0, 19) + ptCheck(b),
  validate: (b) => ptCheck(b) === b.slice(19, 21),
};

// Finland: Luhn check digit on the 14-digit account number.
const luhnDigit = (payload: string) => {
  const total = payload
    .split('')
    .reverse()
    .reduce((s, ch, i) => s + (i % 2 === 0 ? sumDigits(Number(ch) * 2) : Number(ch)), 0);
  return String((10 - (total % 10)) % 10);
};
const fi: NationalCheck = {
  name: 'Finnish Luhn check',
  apply: (b) => b.slice(0, 13) + luhnDigit(b.slice(0, 13)),
  validate: (b) => luhnDigit(b.slice(0, 13)) === b[13],
};

export const NATIONAL_CHECKS: Record<string, NationalCheck> = {
  FR: rib,
  MC: rib,
  ES: es,
  IT: it,
  SM: it,
  BE: be,
  NO: no,
  PT: pt,
  FI: fi,
};
