import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createRng } from '../../lib/rng';
import { type ChargeBearer, type Direction, PACS008_COUNTRIES, generatePacs008 } from './pacs008';

/**
 * The CBPR+ XSD is a licensed Swift MyStandards file, so it isn't committed. Schema validation runs when
 * the file is at PACS008_XSD, or by default at schemas/pacs.008.001.08.xsd, and xmllint is installed;
 * otherwise it is skipped.
 */
const XSD = process.env.PACS008_XSD || resolve(__dirname, '../../../schemas/pacs.008.001.08.xsd');
const hasXmllint = (() => {
  try {
    execFileSync('xmllint', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();
const canValidate = existsSync(XSD) && hasXmllint;

const dir = mkdtempSync(join(tmpdir(), 'pacs008-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const cases = PACS008_COUNTRIES.flatMap((c) => (['inbound', 'outbound'] as Direction[]).map((d) => [c.code, d] as const));

describe('generatePacs008', () => {
  it('excludes countries without BIC-identified banks', () => {
    expect(PACS008_COUNTRIES.map((c) => c.code)).not.toContain('DK');
    expect(PACS008_COUNTRIES.map((c) => c.code)).toEqual(expect.arrayContaining(['GB', 'US', 'DE', 'JP', 'CN', 'RU', 'AU', 'CA']));
  });

  it('puts Starling on the right side', () => {
    const inbound = generatePacs008({ direction: 'inbound', country: 'DE' }, createRng(1));
    expect(inbound.creditor.bic).toBe('SRLGGB2L');
    expect(inbound.xml).toMatch(/<InstdAgt>\s*<FinInstnId>\s*<BICFI>SRLGGB2L<\/BICFI>/);
    const outbound = generatePacs008({ direction: 'outbound', country: 'DE' }, createRng(1));
    expect(outbound.debtor.bic).toBe('SRLGGB2L');
    expect(outbound.xml).toMatch(/<InstgAgt>\s*<FinInstnId>\s*<BICFI>SRLGGB2L<\/BICFI>/);
  });

  it('deducts the fee from the settlement amount when the creditor bears charges', () => {
    const { xml } = generatePacs008({ direction: 'outbound', country: 'US', amount: 1000, chargeBearer: 'CRED', currency: 'USD' }, createRng(2));
    const settled = Number(xml.match(/<IntrBkSttlmAmt Ccy="USD">([\d.]+)</)![1]);
    const fee = Number(xml.match(/<ChrgsInf>\s*<Amt Ccy="USD">([\d.]+)</)![1]);
    expect(settled + fee).toBeCloseTo(1000);
  });

  it('uses whole amounts for JPY', () => {
    const { xml } = generatePacs008({ direction: 'outbound', country: 'JP' }, createRng(3));
    expect(xml).toMatch(/<IntrBkSttlmAmt Ccy="JPY">\d+</);
  });

  it.skipIf(!canValidate).each(cases)('%s %s validates against the CBPR+ XSD', (country, direction) => {
    const bearers: ChargeBearer[] = ['SHAR', 'DEBT', 'CRED'];
    for (let i = 0; i < 6; i++) {
      const { xml } = generatePacs008({ direction, country, chargeBearer: bearers[i % 3] }, createRng(100 + i));
      const file = join(dir, `${country}-${direction}-${i}.xml`);
      writeFileSync(file, xml);
      try {
        execFileSync('xmllint', ['--noout', '--schema', XSD, file], { stdio: 'pipe' });
      } catch (e) {
        throw new Error(`${(e as { stderr: Buffer }).stderr.toString()}\n${xml}`);
      }
    }
  });
});
