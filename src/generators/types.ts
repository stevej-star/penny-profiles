export interface Field {
  label: string;
  value: string;
  /** Value copied to the clipboard, when it differs from the display value. */
  copy?: string;
  /** Which payment view the field belongs to; untagged fields show in both. */
  scope?: 'local' | 'intl';
}

export type View = 'both' | 'local' | 'intl';

export function fieldsForView(fields: Field[], view: View): Field[] {
  return view === 'both' ? fields : fields.filter((f) => !f.scope || f.scope === view);
}

export interface Generated {
  title: string;
  fields: Field[];
  /** Flat key/value form used for JSON/CSV export. */
  data: Record<string, string>;
  check: { valid: boolean; reason: string };
}
