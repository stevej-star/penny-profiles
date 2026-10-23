/**
 * ISO 20022 structured postal address (PostalAddress24) as used by CBPR+, in XML element order.
 * Persona addresses are generated directly in this shape, with these maximum lengths.
 */
export interface StructuredAddress {
  streetName: string;
  buildingNumber: string;
  buildingName: string;
  floor: string;
  room: string;
  postCode: string;
  townName: string;
  townLocationName: string;
  districtName: string;
  countrySubDivision: string;
  /** ISO 3166 alpha-2 country code. */
  country: string;
}

export const ISO_ADDRESS_FIELDS: { key: keyof StructuredAddress; tag: string; label: string; max: number; required?: boolean }[] = [
  { key: 'streetName', tag: 'StrtNm', label: 'Street name', max: 70 },
  { key: 'buildingNumber', tag: 'BldgNb', label: 'Building number', max: 16 },
  { key: 'buildingName', tag: 'BldgNm', label: 'Building name', max: 35 },
  { key: 'floor', tag: 'Flr', label: 'Floor', max: 70 },
  { key: 'room', tag: 'Room', label: 'Room / flat', max: 70 },
  { key: 'postCode', tag: 'PstCd', label: 'Post code', max: 16 },
  { key: 'townName', tag: 'TwnNm', label: 'Town name', max: 35, required: true },
  { key: 'townLocationName', tag: 'TwnLctnNm', label: 'Town location', max: 35 },
  { key: 'districtName', tag: 'DstrctNm', label: 'District', max: 35 },
  { key: 'countrySubDivision', tag: 'CtrySubDvsn', label: 'Country subdivision', max: 35 },
  { key: 'country', tag: 'Ctry', label: 'Country', max: 2, required: true },
];

/** CBPR+ "Extended" FIN-X character set allowed in names and addresses. */
export const SWIFT_EXTENDED = /^[0-9a-zA-Z/\-?:().,'+ !#$%&*=^_`{|}~";<>@[\\\]]*$/;

/** Truncate every field to its maximum length. */
export function clampAddress(a: StructuredAddress): StructuredAddress {
  const out = { ...a };
  for (const f of ISO_ADDRESS_FIELDS) out[f.key] = out[f.key].slice(0, f.max).trim();
  return out;
}

/** Problems that would stop this address being sent as a CBPR+ structured address. */
export function swiftAddressIssues(a: StructuredAddress): string[] {
  const issues: string[] = [];
  for (const f of ISO_ADDRESS_FIELDS) {
    const v = a[f.key];
    if (f.required && !v) issues.push(`${f.tag} is mandatory`);
    if (v.length > f.max) issues.push(`${f.tag} is longer than ${f.max} characters`);
    if (!SWIFT_EXTENDED.test(v)) issues.push(`${f.tag} has characters outside the CBPR+ set`);
  }
  if (!/^[A-Z]{2}$/.test(a.country)) issues.push('Ctry must be a 2-letter ISO code');
  return issues;
}

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** <PstlAdr> element with only the populated fields, in schema order. */
export function postalAddressXml(a: StructuredAddress, indent = ''): string {
  const lines = ISO_ADDRESS_FIELDS.filter((f) => a[f.key]).map(
    (f) => `${indent}  <${f.tag}>${escapeXml(a[f.key])}</${f.tag}>`,
  );
  return [`${indent}<PstlAdr>`, ...lines, `${indent}</PstlAdr>`].join('\n');
}
