import { type ReactNode, useState } from 'react';

export function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-600">{text}</span>
      {children}
    </label>
  );
}

const inputClass =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500';

export function Select({
  value,
  onChange,
  options,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  id?: string;
}) {
  return (
    <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" className="h-4 w-4 accent-amber-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  const styles =
    variant === 'primary'
      ? 'bg-amber-600 text-white hover:bg-amber-700'
      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
  return (
    <button {...props} className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm ${styles} ${props.className ?? ''}`}>
      {children}
    </button>
  );
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">{children}</div>;
}

export function CheckBadge({ valid, reason }: { valid: boolean; reason: string }) {
  return (
    <div
      className={`rounded-md px-3 py-2 text-sm ${valid ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}
      data-testid="check"
    >
      <span className="font-semibold">{valid ? '✓ Valid' : '✗ Invalid'}</span> · {reason}
    </div>
  );
}
