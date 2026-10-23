import { describe, expect, it } from 'vitest';
import { type StructuredAddress, clampAddress, postalAddressXml, swiftAddressIssues } from './isoAddress';

const base: StructuredAddress = {
  streetName: 'High Street',
  buildingNumber: '12',
  buildingName: '',
  floor: '',
  room: 'Flat 3',
  postCode: 'SW1A 1AA',
  townName: 'London',
  townLocationName: '',
  districtName: '',
  countrySubDivision: 'Greater London',
  country: 'GB',
};

describe('structured address', () => {
  it('accepts a complete Latin address', () => {
    expect(swiftAddressIssues(base)).toEqual([]);
  });

  it('flags missing mandatory fields, bad characters and over-long values', () => {
    expect(swiftAddressIssues({ ...base, townName: '' })).toContain('TwnNm is mandatory');
    expect(swiftAddressIssues({ ...base, townName: 'Zürich' })).toContain('TwnNm has characters outside the CBPR+ set');
    expect(swiftAddressIssues({ ...base, buildingNumber: '1'.repeat(17) })).toContain('BldgNb is longer than 16 characters');
    expect(swiftAddressIssues({ ...base, country: 'gb' })).toContain('Ctry must be a 2-letter ISO code');
  });

  it('clamps fields to their maximum lengths', () => {
    const long = clampAddress({ ...base, townName: 'X'.repeat(50), streetName: 'Y'.repeat(80) });
    expect(long.townName).toHaveLength(35);
    expect(long.streetName).toHaveLength(70);
  });

  it('renders populated fields in schema order', () => {
    expect(postalAddressXml(base)).toBe(
      [
        '<PstlAdr>',
        '  <StrtNm>High Street</StrtNm>',
        '  <BldgNb>12</BldgNb>',
        '  <Room>Flat 3</Room>',
        '  <PstCd>SW1A 1AA</PstCd>',
        '  <TwnNm>London</TwnNm>',
        '  <CtrySubDvsn>Greater London</CtrySubDvsn>',
        '  <Ctry>GB</Ctry>',
        '</PstlAdr>',
      ].join('\n'),
    );
  });
});
