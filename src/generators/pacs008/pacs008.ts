import type { Rng } from '../../lib/rng';
import { IBAN_BANKS, generateIban } from '../iban/ibanAccount';
import { IBAN_COUNTRY_BY_CODE } from '../iban/registry';
import { ISO_ADDRESS_FIELDS } from '../persona/isoAddress';
import { PERSONA_COUNTRIES, type PersonaResult, generatePersona } from '../persona/persona';
import type { Field } from '../types';
import { UK_BANKS, generateUkAccount } from '../uk/ukAccount';
import { US_BANKS, generateUsAccount } from '../us/aba';
import { WORLD_COUNTRIES, generateWorldAccount } from '../world/world';

/**
 * CBPR+ pacs.008.001.08 (FI to FI customer credit transfer) between a Starling customer and a
 * persona held at a foreign (or another UK) bank, built to the CBPR+ SR2025 usage guideline.
 */

export type Direction = 'inbound' | 'outbound';
export type ChargeBearer = 'SHAR' | 'DEBT' | 'CRED';

export interface Pacs008Options {
  direction: Direction;
  /** Counterparty persona country. */
  country: string;
  /** ISO currency; defaults to GBP inbound and the counterparty's local currency outbound. */
  currency?: string;
  /** Instructed amount; random when omitted. */
  amount?: number;
  chargeBearer?: ChargeBearer;
  /** Creation time; defaults to now. */
  now?: Date;
}

interface AccountHolder {
  persona: PersonaResult;
  bankName: string;
  bic: string;
  account: { iban: string } | { other: string };
  /** Domestic clearing system code (ExternalClearingSystemIdentification1Code) and member ID. */
  clearing?: { system: string; memberId: string };
  displayAccount: string;
}

export interface Pacs008Result {
  xml: string;
  summary: Field[];
  debtor: AccountHolder;
  creditor: AccountHolder;
  uetr: string;
}

export const STARLING = { name: 'Starling Bank', bic: 'SRLGGB2L', sortCode: '608371' };

const LOCAL_CURRENCY: Record<string, string> = Object.fromEntries([
  ['GB', 'GBP'],
  ['US', 'USD'],
  ...WORLD_COUNTRIES.map((c) => [c.code, c.currency]),
  ...[...IBAN_COUNTRY_BY_CODE.values()].map((c) => [c.code, c.currency]),
]);

/** Currencies with no minor unit. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'ISK']);

/** Persona countries where every bundled bank has a BIC, so the agent can be identified on SWIFT. */
export const PACS008_COUNTRIES = PERSONA_COUNTRIES.filter(
  (c) => ['GB', 'US'].includes(c.code) || WORLD_COUNTRIES.some((w) => w.code === c.code) || IBAN_BANKS[c.code]?.length,
);

export function localCurrency(country: string): string {
  return LOCAL_CURRENCY[country] ?? 'EUR';
}

export function currencyDecimals(ccy: string): number {
  return ZERO_DECIMAL.has(ccy) ? 0 : 2;
}

function uuidV4(rng: Rng): string {
  const hex = Array.from({ length: 32 }, () => rng.int(0, 15).toString(16));
  hex[12] = '4';
  hex[16] = '89ab'[rng.int(0, 3)];
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ref = (rng: Rng, length: number) => Array.from({ length }, () => rng.pick([...ALNUM])).join('');

function starlingCustomer(rng: Rng): AccountHolder {
  const persona = generatePersona({ country: 'GB', latin: true }, rng);
  const { data } = generateUkAccount({ bankId: 'starling' }, rng);
  return {
    persona,
    bankName: STARLING.name,
    bic: STARLING.bic,
    account: { iban: data.iban },
    clearing: { system: 'GBDSC', memberId: data.sortCode },
    displayAccount: `${data.iban} (sort code ${data.sortCode}, account ${data.accountNumber})`,
  };
}

function counterparty(country: string, rng: Rng): AccountHolder {
  const persona = generatePersona({ country, latin: true }, rng);
  if (country === 'GB') {
    const bank = rng.pick(UK_BANKS.filter((b) => b.id !== 'starling'));
    const { data } = generateUkAccount({ bankId: bank.id }, rng);
    return {
      persona,
      bankName: data.bank,
      bic: data.bic,
      account: { iban: data.iban },
      clearing: { system: 'GBDSC', memberId: data.sortCode },
      displayAccount: `${data.iban} (sort code ${data.sortCode}, account ${data.accountNumber})`,
    };
  }
  if (country === 'US') {
    const bank = rng.pick(US_BANKS.filter((b) => b.bic));
    const { data } = generateUsAccount({ bankId: bank.id }, rng);
    return {
      persona,
      bankName: data.bank,
      bic: data.bic,
      account: { other: data.accountNumber },
      clearing: { system: 'USABA', memberId: data.routingNumber },
      displayAccount: `${data.accountNumber} (ABA ${data.routingNumber})`,
    };
  }
  if (WORLD_COUNTRIES.some((w) => w.code === country)) {
    const { data } = generateWorldAccount(country, {}, rng);
    const clearing = {
      AU: { system: 'AUBSB', memberId: data.bsb },
      CA: { system: 'CACPA', memberId: data.eftRouting },
      JP: { system: 'JPZGN', memberId: `${data.bankCode}${data.branchCode}` },
      CN: { system: 'CNAPS', memberId: data.cnaps },
      RU: { system: 'RUCBC', memberId: data.bik },
    }[country];
    return {
      persona,
      bankName: data.bank,
      bic: data.bic,
      account: { other: data.accountNumber },
      clearing,
      displayAccount: `${data.accountNumber} (${clearing?.system} ${clearing?.memberId})`,
    };
  }
  const { data } = generateIban({ country, bankName: 'any' }, rng);
  return { persona, bankName: data.bank, bic: data.bic, account: { iban: data.iban }, displayAccount: data.iban };
}

// ---------- XML ----------

type Node = [name: string, content: string | (Node | false | undefined)[], attrs?: Record<string, string>];

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cut = (s: string, max: number) => s.slice(0, max).trim();

function render(node: Node, depth = 0): string {
  const [name, content, attrs] = node;
  const pad = '  '.repeat(depth);
  const attrText = Object.entries(attrs ?? {})
    .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
    .join('');
  if (typeof content === 'string') return `${pad}<${name}${attrText}>${escapeXml(content)}</${name}>`;
  const children = content.filter((c): c is Node => Boolean(c)).map((c) => render(c, depth + 1));
  return `${pad}<${name}${attrText}>\n${children.join('\n')}\n${pad}</${name}>`;
}

/** Optional element: omitted when the value is empty. */
const opt = (name: string, value: string, max: number): Node | false => Boolean(value) && [name, cut(value, max)];

function partyNode(name: string, holder: AccountHolder): Node {
  const { persona } = holder.persona;
  const a = persona.address;
  return [
    name,
    [
      ['Nm', cut(persona.fullName, 140)],
      ['PstlAdr', ISO_ADDRESS_FIELDS.map((f) => opt(f.tag, a[f.key], f.max))],
    ],
  ];
}

function accountNode(name: string, holder: AccountHolder): Node {
  return [name, [['Id', ['iban' in holder.account ? ['IBAN', holder.account.iban] : ['Othr', [['Id', cut(holder.account.other, 34)]]]]]]];
}

function agentNode(name: string, holder: AccountHolder): Node {
  return [
    name,
    [
      [
        'FinInstnId',
        [
          ['BICFI', holder.bic],
          holder.clearing && [
            'ClrSysMmbId',
            [
              ['ClrSysId', [['Cd', holder.clearing.system]]],
              ['MmbId', holder.clearing.memberId],
            ],
          ],
        ],
      ],
    ],
  ];
}

const bicOnly = (name: string, bic: string): Node => [name, [['FinInstnId', [['BICFI', bic]]]]];

const REMITTANCE = [
  (r: string) => `Invoice INV-${r}`,
  (r: string) => `Rent payment ref ${r}`,
  () => 'Family support',
  (r: string) => `Tuition fees student ${r}`,
  (r: string) => `Consulting services PO ${r}`,
  () => 'Gift',
];

export function generatePacs008(opts: Pacs008Options, rng: Rng): Pacs008Result {
  const starling = starlingCustomer(rng);
  const other = counterparty(opts.country, rng);
  const [debtor, creditor] = opts.direction === 'inbound' ? [other, starling] : [starling, other];

  const currency = opts.currency || (opts.direction === 'inbound' ? 'GBP' : localCurrency(opts.country));
  const decimals = currencyDecimals(currency);
  const scale = currency === 'JPY' ? 150 : 1;
  const instructed = opts.amount ?? Math.round(rng.int(1000, 2500000) * scale) / 100;
  const chargeBearer = opts.chargeBearer ?? 'SHAR';
  // With CRED, the debtor agent deducts its fee from the amount it passes on.
  const fee = chargeBearer === 'CRED' ? Math.round(rng.int(500, 3500) * scale) / 100 : 0;
  const settled = Math.max(0, instructed - fee);
  const fmt = (n: number) => n.toFixed(decimals);

  const now = opts.now ?? new Date();
  const creDtTm = `${now.toISOString().slice(0, 19)}+00:00`;
  const settlementDate = now.toISOString().slice(0, 10);
  const uetr = uuidV4(rng);
  const instrId = ref(rng, 16);
  const msgId = `${debtor.bic.slice(0, 4)}${settlementDate.replace(/-/g, '')}${ref(rng, 10)}`;
  const endToEndId = `E2E${ref(rng, 20)}`;
  const remittance = rng.pick(REMITTANCE)(ref(rng, 8));

  const doc: Node = [
    'Document',
    [
      [
        'FIToFICstmrCdtTrf',
        [
          [
            'GrpHdr',
            [
              ['MsgId', msgId],
              ['CreDtTm', creDtTm],
              ['NbOfTxs', '1'],
              ['SttlmInf', [['SttlmMtd', 'INDA']]],
            ],
          ],
          [
            'CdtTrfTxInf',
            [
              [
                'PmtId',
                [
                  ['InstrId', instrId],
                  ['EndToEndId', endToEndId],
                  ['TxId', instrId],
                  ['UETR', uetr],
                ],
              ],
              ['IntrBkSttlmAmt', fmt(settled), { Ccy: currency }],
              ['IntrBkSttlmDt', settlementDate],
              ['InstdAmt', fmt(instructed), { Ccy: currency }],
              ['ChrgBr', chargeBearer],
              fee > 0 && [
                'ChrgsInf',
                [
                  ['Amt', fmt(fee), { Ccy: currency }],
                  bicOnly('Agt', debtor.bic),
                ],
              ],
              bicOnly('InstgAgt', debtor.bic),
              bicOnly('InstdAgt', creditor.bic),
              partyNode('Dbtr', debtor),
              accountNode('DbtrAcct', debtor),
              agentNode('DbtrAgt', debtor),
              agentNode('CdtrAgt', creditor),
              partyNode('Cdtr', creditor),
              accountNode('CdtrAcct', creditor),
              ['RmtInf', [['Ustrd', remittance]]],
            ],
          ],
        ],
      ],
    ],
    { xmlns: 'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${render(doc)}\n`;
  const party = (h: AccountHolder) => `${h.persona.persona.fullName}, ${h.persona.persona.address.townName} (${h.persona.persona.address.country})`;

  return {
    xml,
    uetr,
    debtor,
    creditor,
    summary: [
      { label: 'Direction', value: opts.direction === 'inbound' ? 'Inbound to Starling' : 'Outbound from Starling' },
      { label: 'Debtor', value: party(debtor) },
      { label: 'Debtor account', value: debtor.displayAccount },
      { label: 'Debtor agent', value: `${debtor.bankName} (${debtor.bic})` },
      { label: 'Creditor', value: party(creditor) },
      { label: 'Creditor account', value: creditor.displayAccount },
      { label: 'Creditor agent', value: `${creditor.bankName} (${creditor.bic})` },
      { label: 'Instructed amount', value: `${fmt(instructed)} ${currency}` },
      { label: 'Settlement amount', value: `${fmt(settled)} ${currency}${fee ? ` (after ${fmt(fee)} fee)` : ''}` },
      { label: 'Charge bearer', value: chargeBearer },
      { label: 'UETR', value: uetr },
      { label: 'End-to-end ID', value: endToEndId },
      { label: 'Remittance', value: remittance },
    ],
  };
}
