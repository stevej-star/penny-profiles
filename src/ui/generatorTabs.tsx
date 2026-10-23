import { useMemo } from 'react';
import { IBAN_BANKS, generateIban } from '../generators/iban/ibanAccount';
import { IBAN_COUNTRIES } from '../generators/iban/registry';
import { ISO_ADDRESS_FIELDS, postalAddressXml, swiftAddressIssues } from '../generators/persona/isoAddress';
import { PERSONA_COUNTRIES, generatePersona } from '../generators/persona/persona';
import { UK_BANKS, formatSortCode, generateUkAccount } from '../generators/uk/ukAccount';
import { US_BANKS, generateUsAccount } from '../generators/us/aba';
import { WORLD_BANKS, WORLD_COUNTRIES, generateWorldAccount } from '../generators/world/world';
import type { View } from '../generators/types';
import { createRng } from '../lib/rng';
import { FieldTable, ResultCard } from './components/ResultCard';
import { Button, CheckBadge, Checkbox, CopyButton, Label, Panel, Select, TextInput } from './components/controls';
import type { UrlState } from './urlState';

export interface TabProps {
  state: UrlState;
  update: (patch: UrlState) => void;
  seed: number;
  regenerate: () => void;
}

function Toolbar({ children, regenerate }: { children: React.ReactNode; regenerate: () => void }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-end gap-4">
        {children}
        <Button onClick={regenerate} className="ml-auto" data-testid="generate">
          Generate
        </Button>
      </div>
    </Panel>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

const flag = (v: boolean) => (v ? '1' : '');

export const viewOf = (state: UrlState): View => (state.view as View) || 'both';

export function ViewSelect({ state, update }: { state: UrlState; update: (patch: UrlState) => void }) {
  return (
    <Label text="Details">
      <Select
        id="view"
        value={viewOf(state)}
        onChange={(v) => update({ view: v === 'both' ? '' : v })}
        options={[
          { value: 'both', label: 'Local + international' },
          { value: 'local', label: 'Local (domestic)' },
          { value: 'intl', label: 'International (SWIFT)' },
        ]}
      />
    </Label>
  );
}

export function UkTab({ state, update, seed, regenerate }: TabProps) {
  const bankId = state.bank ?? '';
  const bank = UK_BANKS.find((b) => b.id === bankId);
  const sortCodeChoice = state.sc ?? '';
  const custom = state.custom ?? '';
  const sortCode = sortCodeChoice === 'custom' ? custom : sortCodeChoice;
  const invalid = state.invalid === '1';

  const result = useMemo(
    () => generateUkAccount({ bankId: bankId || undefined, sortCode: sortCode || undefined, invalid }, createRng(seed)),
    [bankId, sortCode, invalid, seed],
  );

  const ranges = bank?.ranges?.map(([a, b]) => `${formatSortCode(a)} – ${formatSortCode(b)}`).join(', ');

  return (
    <div className="flex flex-col gap-4">
      <Toolbar regenerate={regenerate}>
        <Label text="Bank">
          <Select
            id="uk-bank"
            value={bankId}
            onChange={(v) => update({ bank: v, sc: '' })}
            options={[{ value: '', label: 'Any bank' }, ...UK_BANKS.map((b) => ({ value: b.id, label: b.name }))]}
          />
        </Label>
        <Label text="Sort code">
          <Select
            id="uk-sortcode"
            value={sortCodeChoice}
            onChange={(v) => update({ sc: v })}
            options={[
              { value: '', label: bank?.ranges ? 'Random from bank range' : 'Random' },
              ...(bank?.sortCodes ?? []).map((sc) => ({ value: sc, label: formatSortCode(sc) })),
              { value: 'custom', label: 'Custom…' },
            ]}
          />
        </Label>
        {sortCodeChoice === 'custom' && (
          <Label text="Custom sort code">
            <TextInput value={custom} placeholder="60-83-71" onChange={(e) => update({ custom: e.target.value })} />
          </Label>
        )}
        <ViewSelect state={state} update={update} />
        <Checkbox label="Invalid on purpose (fails modulus)" checked={invalid} onChange={(v) => update({ invalid: flag(v) })} />
      </Toolbar>
      <Note>
        FPS, BACS and CHAPS all route on sort code + account number; CHAPS and inbound international payments also use the
        BIC / IBAN. {ranges && <>Sort codes for {bank?.name} are drawn from {ranges}, limited to ranges in the Vocalink table.</>}
      </Note>
      <ResultCard result={result} seed={seed} view={viewOf(state)} />
    </div>
  );
}

export function UsTab({ state, update, seed, regenerate }: TabProps) {
  const bankId = state.bank ?? '';
  const bank = US_BANKS.find((b) => b.id === bankId);
  const routing = state.routing ?? '';
  const type = (state.type ?? '') as '' | 'checking' | 'savings';
  const invalid = state.invalid === '1';

  const result = useMemo(
    () =>
      generateUsAccount(
        { bankId: bankId || undefined, routingNumber: routing || undefined, accountType: type || undefined, invalid },
        createRng(seed),
      ),
    [bankId, routing, type, invalid, seed],
  );

  return (
    <div className="flex flex-col gap-4">
      <Toolbar regenerate={regenerate}>
        <Label text="Bank">
          <Select
            id="us-bank"
            value={bankId}
            onChange={(v) => update({ bank: v, routing: '' })}
            options={[{ value: '', label: 'Any bank' }, ...US_BANKS.map((b) => ({ value: b.id, label: b.name }))]}
          />
        </Label>
        <Label text="Routing number">
          <Select
            value={routing}
            onChange={(v) => update({ routing: v })}
            options={[
              { value: '', label: 'Random' },
              ...(bank?.routingNumbers ?? []).map((r) => ({ value: r.number, label: `${r.number} · ${r.region}` })),
            ]}
          />
        </Label>
        <Label text="Account type">
          <Select
            value={type}
            onChange={(v) => update({ type: v })}
            options={[
              { value: '', label: 'Random' },
              { value: 'checking', label: 'Checking' },
              { value: 'savings', label: 'Savings' },
            ]}
          />
        </Label>
        <ViewSelect state={state} update={update} />
        <Checkbox label="Invalid on purpose (bad checksum)" checked={invalid} onChange={(v) => update({ invalid: flag(v) })} />
      </Toolbar>
      <Note>
        ACH and Fedwire both use the 9-digit ABA routing number. Some banks publish a separate wire routing number; the
        region column shows which is which where known.
      </Note>
      <ResultCard result={result} seed={seed} view={viewOf(state)} />
    </div>
  );
}

export function IbanTab({ state, update, seed, regenerate }: TabProps) {
  const country = state.country ?? 'DE';
  const banks = IBAN_BANKS[country] ?? [];
  const bankName = state.ibank ?? (banks.length ? 'any' : '');
  const invalid = state.invalid === '1';

  const result = useMemo(
    () => generateIban({ country, bankName: bankName || undefined, invalid }, createRng(seed)),
    [country, bankName, invalid, seed],
  );

  const countries = [...IBAN_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="flex flex-col gap-4">
      <Toolbar regenerate={regenerate}>
        <Label text="Country">
          <Select
            id="iban-country"
            value={country}
            onChange={(v) => update({ country: v, ibank: '' })}
            options={countries.map((c) => ({ value: c.code, label: `${c.name} (${c.code}) · ${c.currency}` }))}
          />
        </Label>
        <Label text="Bank">
          <Select
            id="iban-bank"
            value={bankName}
            onChange={(v) => update({ ibank: v })}
            options={[
              ...(banks.length ? [{ value: 'any', label: 'Any listed bank' }] : []),
              ...banks.map((b) => ({ value: b.name, label: b.name })),
              { value: '', label: 'Random bank code (fictional)' },
            ]}
          />
        </Label>
        <ViewSelect state={state} update={update} />
        <Checkbox label="Invalid on purpose (bad check digits)" checked={invalid} onChange={(v) => update({ invalid: flag(v) })} />
      </Toolbar>
      <Note>
        For the UK, use the UK tab: it produces GB IBANs whose account numbers also pass modulus checking. Germany has
        hundreds of bank-specific account check methods, so German account numbers here only guarantee valid IBAN check
        digits.
      </Note>
      <ResultCard result={result} seed={seed} view={viewOf(state)} />
    </div>
  );
}

export function PersonaTab({ state, update, seed, regenerate }: TabProps) {
  const country = state.pcountry ?? 'GB';
  const withAccount = state.account !== '0';
  const latin = state.latin === '1';
  const minAge = Number(state.minAge ?? 18);
  const maxAge = Number(state.maxAge ?? 80);

  const result = useMemo(
    () => generatePersona({ country, withAccount, minAge, maxAge, latin }, createRng(seed)),
    [country, withAccount, minAge, maxAge, latin, seed],
  );
  const p = result.persona;
  const a = p.address;
  const addressIssues = swiftAddressIssues(a);

  return (
    <div className="flex flex-col gap-4">
      <Toolbar regenerate={regenerate}>
        <Label text="Country">
          <Select
            id="persona-country"
            value={country}
            onChange={(v) => update({ pcountry: v })}
            options={PERSONA_COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
          />
        </Label>
        <Label text="Min age">
          <TextInput type="number" min={0} max={110} className="w-20" value={minAge} onChange={(e) => update({ minAge: e.target.value })} />
        </Label>
        <Label text="Max age">
          <TextInput type="number" min={0} max={110} className="w-20" value={maxAge} onChange={(e) => update({ maxAge: e.target.value })} />
        </Label>
        <Checkbox label="Latin script (SWIFT-safe)" checked={latin} onChange={(v) => update({ latin: flag(v) })} />
        <Checkbox label="Include bank account" checked={withAccount} onChange={(v) => update({ account: v ? '' : '0' })} />
        {withAccount && <ViewSelect state={state} update={update} />}
      </Toolbar>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">
              {[p.title, p.fullName].filter(Boolean).join(' ')}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">seed {seed}</span>
              <CopyButton value={JSON.stringify(result.data, null, 2)} label="Copy JSON" />
            </div>
          </div>
          <FieldTable
            fields={[
              { label: 'Title', value: p.title },
              { label: 'First name', value: p.firstName },
              { label: 'Middle name', value: p.middleName },
              { label: 'Last name', value: p.lastName },
              { label: 'Full name', value: p.fullName },
              { label: 'Sex', value: p.sex },
              { label: 'Date of birth', value: p.dateOfBirth },
              { label: 'Age', value: String(p.age) },
              { label: 'Email', value: p.email },
              { label: 'Phone', value: p.phone },
            ]}
          />
        </Panel>
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Address (ISO 20022)</h3>
            <div className="flex items-center gap-1">
              <CopyButton value={postalAddressXml(a)} label="Copy <PstlAdr>" />
              <CopyButton value={result.formattedAddress} label="Copy formatted" />
            </div>
          </div>
          <FieldTable
            fields={ISO_ADDRESS_FIELDS.filter((f) => a[f.key] || f.required).map((f) => ({
              label: `${f.label} (${f.tag})`,
              value: f.key === 'country' ? `${a.country} · ${a.countryName}` : a[f.key],
              copy: a[f.key],
            }))}
          />
          <div className="mt-3">
            {addressIssues.length === 0 ? (
              <CheckBadge valid reason="Valid CBPR+ structured address (fields, lengths and character set)" />
            ) : (
              <CheckBadge
                valid={false}
                reason={`Not SWIFT-safe: ${[...new Set(addressIssues)].join('; ')}${latin ? '' : '. Turn on Latin script to fix'}`}
              />
            )}
          </div>
          <pre className="mt-3 rounded bg-slate-50 p-3 text-sm whitespace-pre-wrap">{result.formattedAddress}</pre>
        </Panel>
      </div>
      {result.account && <ResultCard result={result.account} view={viewOf(state)} />}
      <Note>Emails use the reserved example.com / .org / .net domains so they can never reach a real inbox.</Note>
    </div>
  );
}

export function WorldTab({ state, update, seed, regenerate }: TabProps) {
  const code = state.wcountry ?? 'AU';
  const country = WORLD_COUNTRIES.find((c) => c.code === code) ?? WORLD_COUNTRIES[0];
  const bankId = state.bank ?? '';
  const accountType = state.atype ?? '';
  const currency = state.currency ?? '';
  const invalid = country.hasChecksum && state.invalid === '1';

  const result = useMemo(
    () =>
      generateWorldAccount(
        country.code,
        { bankId: bankId || undefined, accountType: accountType || undefined, currency: currency || undefined, invalid },
        createRng(seed),
      ),
    [country.code, bankId, accountType, currency, invalid, seed],
  );

  return (
    <div className="flex flex-col gap-4">
      <Toolbar regenerate={regenerate}>
        <Label text="Country">
          <Select
            id="world-country"
            value={country.code}
            onChange={(v) => update({ wcountry: v, bank: '', atype: '', currency: '', invalid: '' })}
            options={WORLD_COUNTRIES.map((c) => ({ value: c.code, label: `${c.name} (${c.currency})` }))}
          />
        </Label>
        <Label text="Bank">
          <Select
            id="world-bank"
            value={bankId}
            onChange={(v) => update({ bank: v })}
            options={[
              { value: '', label: 'Any bank' },
              ...WORLD_BANKS[country.code].map((b) => ({ value: b.id, label: `${b.name} · ${b.localName}` })),
            ]}
          />
        </Label>
        {country.accountTypes && (
          <Label text="Account type">
            <Select value={accountType} onChange={(v) => update({ atype: v })} options={[{ value: '', label: 'Default' }, ...country.accountTypes]} />
          </Label>
        )}
        {country.currencies && (
          <Label text="Currency">
            <Select value={currency} onChange={(v) => update({ currency: v })} options={country.currencies.map((c) => ({ value: c === 'RUB' ? '' : c, label: c }))} />
          </Label>
        )}
        <ViewSelect state={state} update={update} />
        {country.hasChecksum && (
          <Checkbox label="Invalid on purpose (bad check digit)" checked={invalid} onChange={(v) => update({ invalid: flag(v) })} />
        )}
      </Toolbar>
      <Note>{WORLD_NOTES[country.code]}</Note>
      <ResultCard result={result} seed={seed} view={viewOf(state)} />
    </div>
  );
}

const WORLD_NOTES: Record<string, string> = {
  AU: 'Domestic payments (BECS direct entry, NPP / Osko) use the 6-digit BSB + account number; the first two BSB digits identify the bank and the third the state. Inbound SWIFT payments quote the BIC plus BSB and account.',
  CA: 'Domestic EFT uses the 9-digit routing number (0 + institution + transit); cheques show transit-institution. Inbound SWIFT wires quote the BIC and the //CC clearing code. Account numbers have no published checksum.',
  JP: 'Zengin transfers need bank code, branch code, account type and a 7-digit account number. Japan Post Bank (ゆうちょ) passbook numbers (記号/番号) are converted to a branch code and account number for transfers from other banks.',
  CN: 'Personal accounts are UnionPay debit card numbers (Luhn check digit). The CNAPS code identifies the branch for domestic and SWIFT payments; its check digit is not modelled.',
  RU: 'The 9th digit of the account is a control key computed with the bank BIK. SWIFT payments quote the BIK and correspondent account as //RU…; several Russian banks are disconnected from SWIFT, so international details are for format testing only.',
};
