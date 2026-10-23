import worldBanks from '../../data/banks/world.json';
import type { Rng } from '../../lib/rng';
import type { Field, Generated } from '../types';

/** Countries that don't use IBAN, each with its own domestic account format. */
export interface WorldBank {
  id: string;
  name: string;
  localName: string;
  /** Australian BSB prefix, Canadian institution number, Zengin bank code, CNAPS bank code prefix or Russian BIK. */
  code: string;
  bic: string;
  bins?: string[];
  cardLength?: number;
  accountLength?: number;
  corrAccount?: string;
}

export const WORLD_BANKS: Record<string, WorldBank[]> = worldBanks;

export interface WorldOptions {
  bankId?: string;
  /** Japan: futsu | toza. Russia: individual | business. */
  accountType?: string;
  /** Russia: RUB | USD | EUR. */
  currency?: string;
  /** Produce a failing checksum (China and Russia only; Canada and Japan have none). */
  invalid?: boolean;
}

export interface WorldCountry {
  code: string;
  name: string;
  currency: string;
  /** Whether an account-level checksum exists, so "invalid on purpose" makes sense. */
  hasChecksum: boolean;
  accountTypes?: { value: string; label: string }[];
  currencies?: string[];
  generate(opts: WorldOptions, rng: Rng): Generated;
}

const pickBank = (country: string, id: string | undefined, rng: Rng) =>
  WORLD_BANKS[country].find((b) => b.id === id) ?? rng.pick(WORLD_BANKS[country]);

const result = (bank: WorldBank, title: string, fields: Field[], data: Record<string, string>, check: Generated['check']): Generated => ({
  title: `${bank.name} · ${title}`,
  fields: [
    { label: 'Bank', value: bank.name, scope: 'intl' },
    { label: 'Bank (local name)', value: bank.localName, scope: 'local' },
    ...fields,
    { label: 'SWIFT / BIC', value: bank.bic, scope: 'intl' },
  ],
  data: { bank: bank.name, bankLocalName: bank.localName, ...data, bic: bank.bic },
  check,
});

// ---------- Australia ----------

// Third BSB digit is the state: 2 NSW/ACT, 3 VIC, 4 QLD, 5 SA/NT, 6 WA, 7 TAS.
const AU_STATES = [
  { digit: '2', state: 'NSW' },
  { digit: '3', state: 'VIC' },
  { digit: '4', state: 'QLD' },
  { digit: '5', state: 'SA' },
  { digit: '6', state: 'WA' },
  { digit: '7', state: 'TAS' },
];

function generateAustralia(opts: WorldOptions, rng: Rng): Generated {
  const bank = pickBank('AU', opts.bankId, rng);
  // A 3-digit code already fixes the state (e.g. Bendigo 633).
  const state = bank.code.length === 3 ? AU_STATES.find((s) => s.digit === bank.code[2])! : rng.pick(AU_STATES);
  const bsb = (bank.code.length === 3 ? bank.code : bank.code + state.digit) + rng.digits(3);
  const account = String(rng.int(1, 9)) + rng.digits(bank.accountLength! - 1);
  const bsbFormatted = `${bsb.slice(0, 3)}-${bsb.slice(3)}`;
  return result(
    bank,
    `BSB ${bsbFormatted}`,
    [
      { label: 'BSB', value: bsbFormatted, copy: bsb },
      { label: 'Account number', value: account },
      { label: 'BSB state', value: state.state, scope: 'local' },
    ],
    { bsb, accountNumber: account, state: state.state },
    { valid: true, reason: 'Format OK (Australian account numbers have no published checksum)' },
  );
}

// ---------- Canada ----------

function generateCanada(opts: WorldOptions, rng: Rng): Generated {
  const bank = pickBank('CA', opts.bankId, rng);
  const transit = String(rng.int(1, 99999)).padStart(5, '0');
  const account = String(rng.int(1, 9)) + rng.digits(6);
  const eft = `0${bank.code}${transit}`;
  return result(
    bank,
    `transit ${transit}`,
    [
      { label: 'Institution number', value: bank.code, scope: 'local' },
      { label: 'Transit (branch) number', value: transit, scope: 'local' },
      { label: 'Account number', value: account },
      { label: 'EFT routing number', value: eft, scope: 'local' },
      { label: 'MICR (cheque) routing', value: `${transit}-${bank.code}`, scope: 'local' },
      { label: 'Canadian clearing code', value: `//CC${eft}`, scope: 'intl' },
    ],
    { institution: bank.code, transit, accountNumber: account, eftRouting: eft, clearingCode: `//CC${eft}` },
    { valid: true, reason: 'Format OK (Canadian account numbers have no published checksum)' },
  );
}

// ---------- Japan ----------

const JP_ACCOUNT_TYPES = [
  { value: 'futsu', label: 'Futsū (普通, ordinary)' },
  { value: 'toza', label: 'Tōza (当座, current)' },
];

function generateJapan(opts: WorldOptions, rng: Rng): Generated {
  const bank = pickBank('JP', opts.bankId, rng);
  const type = JP_ACCOUNT_TYPES.find((t) => t.value === opts.accountType) ?? JP_ACCOUNT_TYPES[0];
  let branch = String(rng.int(1, 999)).padStart(3, '0');
  let account = rng.digits(7);
  const extra: Field[] = [];
  const data: Record<string, string> = {};

  if (bank.id === 'jpbank') {
    // Japan Post Bank passbooks use a 記号 (1xxx0) + 番号 (8 digits ending in 1). For transfers from
    // other banks, the branch code is digits 2–3 of the 記号 followed by 8, and the account number
    // is the 番号 without its final 1.
    const kigou = `1${rng.digits(3)}0`;
    const bangou = `${rng.digits(7)}1`;
    branch = `${kigou.slice(1, 3)}8`;
    account = bangou.slice(0, 7);
    extra.push(
      { label: 'Kigō (記号)', value: kigou, scope: 'local' },
      { label: 'Bangō (番号)', value: bangou, scope: 'local' },
    );
    Object.assign(data, { kigou, bangou });
  }

  return result(
    bank,
    `branch ${branch}`,
    [
      { label: 'Bank code (金融機関コード)', value: bank.code, scope: 'local' },
      { label: 'Branch code (支店番号)', value: branch },
      { label: 'Account type (預金種目)', value: type.label },
      { label: 'Account number (口座番号)', value: account },
      ...extra,
    ],
    { bankCode: bank.code, branchCode: branch, accountType: type.value, accountNumber: account, ...data },
    { valid: true, reason: 'Format OK (Zengin account numbers have no published checksum)' },
  );
}

// ---------- China ----------

export function luhnCheckDigit(payload: string): string {
  const total = payload
    .split('')
    .reverse()
    .reduce((s, ch, i) => {
      const d = Number(ch) * (i % 2 === 0 ? 2 : 1);
      return s + (d > 9 ? d - 9 : d);
    }, 0);
  return String((10 - (total % 10)) % 10);
}

export function validateChinaCard(input: string): { valid: boolean; reason: string; bank?: string } {
  const card = input.replace(/\s/g, '');
  if (!/^\d{16,19}$/.test(card)) return { valid: false, reason: 'Card/account numbers are 16–19 digits' };
  if (luhnCheckDigit(card.slice(0, -1)) !== card.slice(-1)) return { valid: false, reason: 'Luhn check digit is wrong' };
  const bank = WORLD_BANKS.CN.find((b) => b.bins?.some((bin) => card.startsWith(bin)));
  return { valid: true, reason: bank ? `Luhn OK; ${bank.name} card range` : 'Luhn OK (BIN not in bundled list)', bank: bank?.name };
}

// CNAPS area codes for major cities.
const CN_AREAS = [
  { code: '1000', city: 'Beijing' },
  { code: '2900', city: 'Shanghai' },
  { code: '5810', city: 'Guangzhou' },
  { code: '5840', city: 'Shenzhen' },
];

function generateChina(opts: WorldOptions, rng: Rng): Generated {
  const bank = pickBank('CN', opts.bankId, rng);
  const bin = rng.pick(bank.bins!);
  const payload = bin + rng.digits(bank.cardLength! - bin.length - 1);
  let check = luhnCheckDigit(payload);
  if (opts.invalid) check = String((Number(check) + rng.int(1, 9)) % 10);
  const card = payload + check;
  const area = rng.pick(CN_AREAS);
  const cnaps = bank.code + area.code + rng.digits(5);
  const v = validateChinaCard(card);
  return result(
    bank,
    area.city,
    [
      { label: 'Account / card number (账号)', value: card.replace(/(\d{4})(?=\d)/g, '$1 '), copy: card },
      { label: 'CNAPS code (联行号)', value: cnaps },
      { label: 'Branch city', value: area.city, scope: 'local' },
      { label: 'Currency', value: 'CNY', scope: 'intl' },
    ],
    { accountNumber: card, cnaps, city: area.city },
    { valid: v.valid, reason: `${v.reason}. CNAPS code is format-only` },
  );
}

// ---------- Russia ----------

const RU_WEIGHTS = [7, 1, 3];
const RU_CURRENCY_CODES: Record<string, string> = { RUB: '810', USD: '840', EUR: '978' };
const RU_ACCOUNT_TYPES = [
  { value: 'individual', label: 'Individual (40817)' },
  { value: 'business', label: 'Business (40702)' },
];

const ruSum = (digits: string) => digits.split('').reduce((s, ch, i) => s + ((Number(ch) * RU_WEIGHTS[i % 3]) % 10), 0);

/** Control key (9th digit) of a 20-digit Russian account, keyed to the bank BIK. */
export function russianAccountKey(bik: string, account: string, correspondent = false): string {
  const prefix = correspondent ? `0${bik.slice(4, 6)}` : bik.slice(-3);
  const zeroed = account.slice(0, 8) + '0' + account.slice(9);
  return String(((ruSum(prefix + zeroed) % 10) * 3) % 10);
}

export function validateRussianAccount(bikInput: string, accountInput: string): { valid: boolean; reason: string } {
  const bik = bikInput.replace(/\D/g, '');
  const account = accountInput.replace(/\D/g, '');
  if (bik.length !== 9) return { valid: false, reason: 'BIK must be 9 digits' };
  if (account.length !== 20) return { valid: false, reason: 'Account must be 20 digits' };
  const correspondent = account.startsWith('30101');
  if (russianAccountKey(bik, account, correspondent) !== account[8]) {
    return { valid: false, reason: `Control key (9th digit) does not match the BIK` };
  }
  const bank = WORLD_BANKS.RU.find((b) => b.code === bik);
  return {
    valid: true,
    reason: `Control key OK${correspondent ? ' (correspondent account)' : ''}${bank ? `; BIK belongs to ${bank.name}` : ''}`,
  };
}

function generateRussia(opts: WorldOptions, rng: Rng): Generated {
  const bank = pickBank('RU', opts.bankId, rng);
  const type = RU_ACCOUNT_TYPES.find((t) => t.value === opts.accountType) ?? RU_ACCOUNT_TYPES[0];
  const currency = RU_CURRENCY_CODES[opts.currency ?? ''] ? opts.currency! : 'RUB';
  const balance = type.value === 'business' ? '40702' : '40817';
  const draft = balance + RU_CURRENCY_CODES[currency] + '0' + rng.digits(11);
  let key = russianAccountKey(bank.code, draft);
  if (opts.invalid) key = String((Number(key) + rng.int(1, 9)) % 10);
  const account = draft.slice(0, 8) + key + draft.slice(9);
  const v = validateRussianAccount(bank.code, account);
  return result(
    bank,
    `${type.label.split(' ')[0]} ${currency}`,
    [
      { label: 'BIK (БИК)', value: bank.code, scope: 'local' },
      { label: 'Correspondent account (к/с)', value: bank.corrAccount!, scope: 'local' },
      { label: 'Account number (р/с)', value: account },
      { label: 'Account type', value: type.label },
      { label: 'Currency', value: currency },
      { label: 'SWIFT routing (field 57)', value: `//RU${bank.code}.${bank.corrAccount}`, scope: 'intl' },
    ],
    { bik: bank.code, corrAccount: bank.corrAccount!, accountNumber: account, accountType: type.value, currency },
    v,
  );
}

export const WORLD_COUNTRIES: WorldCountry[] = [
  { code: 'AU', name: 'Australia', currency: 'AUD', hasChecksum: false, generate: generateAustralia },
  { code: 'CA', name: 'Canada', currency: 'CAD', hasChecksum: false, generate: generateCanada },
  { code: 'JP', name: 'Japan', currency: 'JPY', hasChecksum: false, accountTypes: JP_ACCOUNT_TYPES, generate: generateJapan },
  { code: 'CN', name: 'China', currency: 'CNY', hasChecksum: true, generate: generateChina },
  {
    code: 'RU',
    name: 'Russia',
    currency: 'RUB',
    hasChecksum: true,
    accountTypes: RU_ACCOUNT_TYPES,
    currencies: Object.keys(RU_CURRENCY_CODES),
    generate: generateRussia,
  },
];

export function generateWorldAccount(country: string, opts: WorldOptions, rng: Rng): Generated {
  const c = WORLD_COUNTRIES.find((w) => w.code === country);
  if (!c) throw new Error(`Unsupported country ${country}`);
  return c.generate(opts, rng);
}
