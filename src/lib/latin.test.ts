import { describe, expect, it } from 'vitest';
import { toSwiftText, transliterateCyrillic } from './latin';

describe('toSwiftText', () => {
  it('strips accents and folds special letters', () => {
    expect(toSwiftText('Montréal')).toBe('Montreal');
    expect(toSwiftText('Société Générale')).toBe('Societe Generale');
    expect(toSwiftText('Løken Ærø')).toBe('Loken AEro');
    expect(toSwiftText('Straße')).toBe('Strasse');
  });

  it('uses ae/oe/ue for German umlauts when asked', () => {
    expect(toSwiftText('Köln Müller Bäcker', true)).toBe('Koeln Mueller Baecker');
    expect(toSwiftText('Malmö')).toBe('Malmo');
  });

  it('transliterates Cyrillic keeping capitalisation', () => {
    expect(transliterateCyrillic('Щукин Юрий')).toBe('Shchukin Iurii');
    expect(toSwiftText('АО «Альфа-Банк»')).toBe('AO "Alfa-Bank"');
  });

  it('drops characters outside the CBPR+ set', () => {
    expect(toSwiftText('小山 Tom')).toBe('Tom');
  });
});
