import { useMemo, useState } from 'react';
import { validateIban } from '../generators/iban/iban';
import { generateIban } from '../generators/iban/ibanAccount';
import { IBAN_COUNTRIES } from '../generators/iban/registry';
import { PERSONA_COUNTRIES, generatePersona } from '../generators/persona/persona';
import { validateUkAccount } from '../generators/uk/modulus';
import { findUkBankForSortCode, generateUkAccount } from '../generators/uk/ukAccount';
import { generateUsAccount, validateRoutingNumber } from '../generators/us/aba';
import { WORLD_COUNTRIES, generateWorldAccount, validateChinaCard, validateRussianAccount } from '../generators/world/world';
import { createRng } from '../lib/rng';
import { Button, CheckBadge, Label, Panel, Select, TextInput } from './components/controls';
import type { TabProps } from './generatorTabs';

export function ValidatorTab() {
  const [sortCode, setSortCode] = useState('');
  const [account, setAccount] = useState('');
  const [iban, setIban] = useState('');
  const [routing, setRouting] = useState('');

  const uk = sortCode && account ? validateUkAccount(sortCode, account) : null;
  const ukBank = sortCode ? findUkBankForSortCode(sortCode.replace(/\D/g, '')) : undefined;
  const ibanResult = iban ? validateIban(iban) : null;
  const aba = routing ? validateRoutingNumber(routing) : null;
  const [bik, setBik] = useState('');
  const [ruAccount, setRuAccount] = useState('');
  const [cnCard, setCnCard] = useState('');
  const ru = bik && ruAccount ? validateRussianAccount(bik, ruAccount) : null;
  const cn = cnCard ? validateChinaCard(cnCard) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel>
        <h3 className="mb-3 font-semibold">UK sort code + account</h3>
        <div className="flex flex-col gap-3">
          <Label text="Sort code">
            <TextInput id="v-sortcode" value={sortCode} placeholder="60-83-71" onChange={(e) => setSortCode(e.target.value)} />
          </Label>
          <Label text="Account number">
            <TextInput id="v-account" value={account} placeholder="12345678" onChange={(e) => setAccount(e.target.value)} />
          </Label>
          {uk && (
            <>
              <CheckBadge valid={uk.valid} reason={uk.reason} />
              {uk.methods.length > 0 && <p className="text-xs text-slate-500">Rules: {uk.methods.join(' + ')}</p>}
            </>
          )}
          {ukBank && <p className="text-xs text-slate-500">Bundled bank match: {ukBank.name}</p>}
        </div>
      </Panel>
      <Panel>
        <h3 className="mb-3 font-semibold">IBAN</h3>
        <div className="flex flex-col gap-3">
          <Label text="IBAN">
            <TextInput id="v-iban" value={iban} placeholder="GB29 NWBK 6016 1331 9268 19" onChange={(e) => setIban(e.target.value)} />
          </Label>
          {ibanResult && (
            <>
              <CheckBadge valid={ibanResult.valid} reason={ibanResult.reason} />
              {ibanResult.country && (
                <p className="text-xs text-slate-500">
                  {ibanResult.country} · bank {ibanResult.bankCode}
                  {ibanResult.branchCode && <> · branch {ibanResult.branchCode}</>}
                </p>
              )}
            </>
          )}
        </div>
      </Panel>
      <Panel>
        <h3 className="mb-3 font-semibold">US ABA routing number</h3>
        <div className="flex flex-col gap-3">
          <Label text="Routing number">
            <TextInput id="v-routing" value={routing} placeholder="021000021" onChange={(e) => setRouting(e.target.value)} />
          </Label>
          {aba && <CheckBadge valid={aba.valid} reason={aba.reason} />}
        </div>
      </Panel>
      <Panel>
        <h3 className="mb-3 font-semibold">Russia BIK + account</h3>
        <div className="flex flex-col gap-3">
          <Label text="BIK">
            <TextInput id="v-bik" value={bik} placeholder="044525225" onChange={(e) => setBik(e.target.value)} />
          </Label>
          <Label text="Account (20 digits)">
            <TextInput id="v-ru-account" value={ruAccount} placeholder="40817810…" onChange={(e) => setRuAccount(e.target.value)} />
          </Label>
          {ru && <CheckBadge valid={ru.valid} reason={ru.reason} />}
        </div>
      </Panel>
      <Panel>
        <h3 className="mb-3 font-semibold">China card / account number</h3>
        <div className="flex flex-col gap-3">
          <Label text="Card number">
            <TextInput id="v-cn-card" value={cnCard} placeholder="6222 0200 …" onChange={(e) => setCnCard(e.target.value)} />
          </Label>
          {cn && <CheckBadge valid={cn.valid} reason={cn.reason} />}
        </div>
      </Panel>
    </div>
  );
}

type BulkKind = 'uk' | 'us' | 'iban' | 'world' | 'persona';
const DEFAULT_COUNTRY: Partial<Record<BulkKind, string>> = { iban: 'DE', world: 'AU', persona: 'GB' };
const MAX_ROWS = 10000;

function toCsv(rows: Record<string, string>[]): string {
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h] ?? '')).join(','))].join('\n');
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkTab({ state, update, seed, regenerate }: TabProps) {
  const kind = (state.kind ?? 'uk') as BulkKind;
  const country = state.bcountry || DEFAULT_COUNTRY[kind] || '';
  const count = Math.min(MAX_ROWS, Math.max(1, Number(state.count ?? 100) || 1));
  const invalid = state.invalid === '1';

  const rows = useMemo(() => {
    const rng = createRng(seed);
    return Array.from({ length: count }, () => {
      switch (kind) {
        case 'uk':
          return generateUkAccount({ invalid }, rng).data;
        case 'us':
          return generateUsAccount({ invalid }, rng).data;
        case 'iban':
          return generateIban({ country, bankName: 'any', invalid }, rng).data;
        case 'world':
          return generateWorldAccount(country, { invalid }, rng).data;
        case 'persona':
          return generatePersona({ country, withAccount: true }, rng).data;
      }
    });
  }, [kind, country, count, invalid, seed]);

  const headers = Object.keys(rows[0] ?? {});
  const countries =
    kind === 'persona'
      ? PERSONA_COUNTRIES
      : kind === 'world'
        ? WORLD_COUNTRIES
        : [...IBAN_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
  const hasCountry = kind in DEFAULT_COUNTRY;
  const fileBase = `pennyprofiles-${kind}${hasCountry ? `-${country}` : ''}-${count}-seed${seed}`;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex flex-wrap items-end gap-4">
          <Label text="Generate">
            <Select
              id="bulk-kind"
              value={kind}
              onChange={(v) => update({ kind: v, bcountry: '' })}
              options={[
                { value: 'uk', label: 'UK accounts' },
                { value: 'us', label: 'US accounts' },
                { value: 'iban', label: 'IBANs' },
                { value: 'world', label: 'AU / CA / JP / CN / RU accounts' },
                { value: 'persona', label: 'Personas with accounts' },
              ]}
            />
          </Label>
          {hasCountry && (
            <Label text="Country">
              <Select
                value={country}
                onChange={(v) => update({ bcountry: v })}
                options={countries.map((c) => ({ value: c.code, label: c.name }))}
              />
            </Label>
          )}
          <Label text={`Rows (max ${MAX_ROWS})`}>
            <TextInput type="number" min={1} max={MAX_ROWS} className="w-28" value={count} onChange={(e) => update({ count: e.target.value })} />
          </Label>
          {kind !== 'persona' && (kind !== 'world' || WORLD_COUNTRIES.find((w) => w.code === country)?.hasChecksum) && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-amber-600" checked={invalid} onChange={(e) => update({ invalid: e.target.checked ? '1' : '' })} />
              Invalid on purpose
            </label>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={regenerate}>
              Reshuffle
            </Button>
            <Button variant="secondary" onClick={() => download(`${fileBase}.json`, JSON.stringify(rows, null, 2), 'application/json')}>
              Download JSON
            </Button>
            <Button onClick={() => download(`${fileBase}.csv`, toCsv(rows), 'text/csv')}>Download CSV</Button>
          </div>
        </div>
      </Panel>
      <Panel>
        <p className="mb-2 text-xs text-slate-500">
          Showing {Math.min(20, rows.length)} of {rows.length} rows · seed {seed}
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs" data-testid="bulk-table">
            <thead>
              <tr className="border-b border-slate-200">
                {headers.map((h) => (
                  <th key={h} className="px-2 py-1 font-medium whitespace-nowrap text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 20).map((r, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {headers.map((h) => (
                    <td key={h} className="px-2 py-1 font-mono whitespace-nowrap">
                      {r[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
