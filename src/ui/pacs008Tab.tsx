import { useMemo } from 'react';
import {
  type ChargeBearer,
  type Direction,
  PACS008_COUNTRIES,
  STARLING,
  generatePacs008,
  localCurrency,
} from '../generators/pacs008/pacs008';
import { createRng } from '../lib/rng';
import { FieldTable } from './components/ResultCard';
import { Button, CopyButton, Label, Panel, Select, TextInput } from './components/controls';
import type { TabProps } from './generatorTabs';

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/xml' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export function Pacs008Tab({ state, update, seed, regenerate }: TabProps) {
  const direction = (state.dir || 'inbound') as Direction;
  const country = PACS008_COUNTRIES.some((c) => c.code === state.cp) ? state.cp : 'DE';
  const currency = state.ccy ?? '';
  const amount = state.amount ?? '';
  const chargeBearer = (state.chrg || 'SHAR') as ChargeBearer;
  const local = localCurrency(country);

  const result = useMemo(
    () =>
      generatePacs008(
        { direction, country, currency: currency || undefined, amount: amount ? Number(amount) : undefined, chargeBearer },
        createRng(seed),
      ),
    [direction, country, currency, amount, chargeBearer, seed],
  );

  const currencies = [...new Set(['GBP', 'EUR', 'USD', local])];
  const countryName = PACS008_COUNTRIES.find((c) => c.code === country)?.name;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex flex-wrap items-end gap-4">
          <Label text="Direction">
            <Select
              id="pacs-direction"
              value={direction}
              onChange={(v) => update({ dir: v === 'inbound' ? '' : v })}
              options={[
                { value: 'inbound', label: `Inbound: persona → ${STARLING.name}` },
                { value: 'outbound', label: `Outbound: ${STARLING.name} → persona` },
              ]}
            />
          </Label>
          <Label text="Persona country">
            <Select
              id="pacs-country"
              value={country}
              onChange={(v) => update({ cp: v })}
              options={PACS008_COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
            />
          </Label>
          <Label text="Currency">
            <Select
              id="pacs-currency"
              value={currency}
              onChange={(v) => update({ ccy: v })}
              options={[
                { value: '', label: `Auto (${direction === 'inbound' ? 'GBP' : local})` },
                ...currencies.map((c) => ({ value: c, label: c })),
              ]}
            />
          </Label>
          <Label text="Amount">
            <TextInput
              id="pacs-amount"
              type="number"
              min={0}
              step="0.01"
              className="w-32"
              placeholder="Random"
              value={amount}
              onChange={(e) => update({ amount: e.target.value })}
            />
          </Label>
          <Label text="Charges">
            <Select
              id="pacs-charges"
              value={chargeBearer}
              onChange={(v) => update({ chrg: v === 'SHAR' ? '' : v })}
              options={[
                { value: 'SHAR', label: 'SHAR (shared)' },
                { value: 'DEBT', label: 'DEBT (debtor pays, OUR)' },
                { value: 'CRED', label: 'CRED (creditor pays, BEN)' },
              ]}
            />
          </Label>
          <Button onClick={regenerate} className="ml-auto" data-testid="generate">
            Generate
          </Button>
        </div>
      </Panel>
      <p className="text-sm text-slate-500">
        CBPR+ pacs.008.001.08 (SR2025) between a random Starling customer ({STARLING.bic}, sort code 60-83-71) and a random{' '}
        {countryName} persona. Names and addresses are romanised and folded to the CBPR+ character set. Every combination is
        validated against the Swift XSD in the test suite.
      </p>
      <div className="flex flex-col gap-4">
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Payment</h3>
            <span className="text-xs text-slate-400">seed {seed}</span>
          </div>
          <FieldTable fields={result.summary} />
        </Panel>
        <Panel>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold">pacs.008 XML</h3>
            <div className="flex items-center gap-2">
              <CopyButton value={result.xml} label="Copy XML" />
              <Button variant="secondary" onClick={() => download(`pacs008-${direction}-${country}-${result.uetr}.xml`, result.xml)}>
                Download
              </Button>
            </div>
          </div>
          <pre className="max-h-[70vh] overflow-auto rounded bg-slate-900 p-4 text-xs leading-relaxed text-slate-100" data-testid="pacs-xml">
            {result.xml}
          </pre>
        </Panel>
      </div>
    </div>
  );
}
