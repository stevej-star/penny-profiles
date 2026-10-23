import { type Generated, type View, fieldsForView } from '../../generators/types';
import { CheckBadge, CopyButton, Panel } from './controls';

export function FieldTable({ fields }: { fields: Generated['fields'] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {fields.map((f) => (
        <div key={f.label} className="grid grid-cols-[11rem_1fr_auto] items-center gap-3 py-2">
          <dt className="text-sm text-slate-500">{f.label}</dt>
          <dd className="font-mono text-sm break-all whitespace-pre-line" data-field={f.label}>
            {f.value || '—'}
          </dd>
          {f.value ? <CopyButton value={f.copy ?? f.value} /> : <span />}
        </div>
      ))}
    </dl>
  );
}

export function ResultCard({ result, seed, view = 'both' }: { result: Generated; seed?: number; view?: View }) {
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{result.title}</h3>
        <div className="flex items-center gap-2">
          {seed !== undefined && <span className="text-xs text-slate-400">seed {seed}</span>}
          <CopyButton value={JSON.stringify(result.data, null, 2)} label="Copy JSON" />
        </div>
      </div>
      <FieldTable fields={fieldsForView(result.fields, view)} />
      <div className="mt-3">
        <CheckBadge {...result.check} />
      </div>
    </Panel>
  );
}
