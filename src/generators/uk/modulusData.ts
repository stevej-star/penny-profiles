import valacdosRaw from '../../data/vocalink/valacdos.txt?raw';
import scsubtabRaw from '../../data/vocalink/scsubtab.txt?raw';

export type ModulusMethod = 'MOD10' | 'MOD11' | 'DBLAL';

export interface ModulusRule {
  start: number;
  end: number;
  method: ModulusMethod;
  /** 14 weights applied to sort code (u–z) then account number (a–h). */
  weights: number[];
  exception?: number;
}

export function parseValacdos(raw: string): ModulusRule[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      return {
        start: Number(parts[0]),
        end: Number(parts[1]),
        method: parts[2] as ModulusMethod,
        weights: parts.slice(3, 17).map(Number),
        exception: parts[17] ? Number(parts[17]) : undefined,
      };
    });
}

export function parseScsubtab(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const [from, to] = line.trim().split(/\s+/);
    if (from && to) map.set(from, to);
  }
  return map;
}

export const MODULUS_RULES = parseValacdos(valacdosRaw);
export const SORT_CODE_SUBSTITUTIONS = parseScsubtab(scsubtabRaw);
