import { describe, expect, it } from 'vitest';
import { createRng } from '../../lib/rng';
import { validateIban } from '../iban/iban';
import { PERSONA_COUNTRIES, generatePersona } from './persona';
import { SWIFT_EXTENDED, swiftAddressIssues } from './isoAddress';

describe('generatePersona', () => {
  it.each(PERSONA_COUNTRIES.map((c) => c.code))('%s persona has a complete structured address and linked account', (code) => {
    const rng = createRng(7);
    for (let i = 0; i < 50; i++) {
      const { persona, account, formattedAddress } = generatePersona({ country: code, withAccount: true, minAge: 21, maxAge: 30 }, rng);
      expect(persona.firstName).not.toBe('');
      expect(persona.lastName).not.toBe('');
      expect(persona.age).toBeGreaterThanOrEqual(21);
      expect(persona.age).toBeLessThanOrEqual(30);
      expect(persona.email).toMatch(/@example\.(com|org|net)$/);
      expect(persona.address).toMatchObject({ country: code });
      expect(swiftAddressIssues(persona.address).filter((i) => !i.includes('characters'))).toEqual([]);
      for (const key of ['buildingNumber', 'streetName', 'townName', 'postCode'] as const) expect(persona.address[key]).not.toBe('');
      expect(formattedAddress).toContain(persona.address.postCode);
      expect(account?.check.valid).toBe(true);
      if (account!.data.iban && code !== 'GB') expect(validateIban(account!.data.iban).valid).toBe(true);
    }
  });

  it('UK postcodes have a valid shape', () => {
    const rng = createRng(8);
    for (let i = 0; i < 200; i++) {
      expect(generatePersona({ country: 'GB' }, rng).persona.address.postCode).toMatch(
        /^[A-Z]{1,2}\d[A-Z\d]? \d[ABD-HJLNP-UW-Z]{2}$/,
      );
    }
  });

  it('is reproducible from a seed', () => {
    expect(generatePersona({ country: 'DE', withAccount: true }, createRng(5)).data).toEqual(
      generatePersona({ country: 'DE', withAccount: true }, createRng(5)).data,
    );
  });
});

describe('Latin (SWIFT-safe) personas', () => {
  it.each(PERSONA_COUNTRIES.map((c) => c.code))('%s names and address use only the CBPR+ character set', (code) => {
    const rng = createRng(13);
    for (let i = 0; i < 50; i++) {
      const { persona } = generatePersona({ country: code, latin: true }, rng);
      expect(swiftAddressIssues(persona.address), code).toEqual([]);
      for (const v of [persona.fullName, persona.firstName, persona.lastName]) {
        expect(v, `${code}: ${v}`).toMatch(SWIFT_EXTENDED);
      }
      expect(persona.fullName.trim()).not.toBe('');
      expect(persona.address.streetName).not.toBe('');
      expect(persona.address.townName).not.toBe('');
    }
  });
});
