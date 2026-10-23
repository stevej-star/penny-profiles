import {
  Faker,
  base,
  da,
  de,
  de_AT,
  de_CH,
  en,
  en_AU,
  en_CA,
  en_GB,
  en_IE,
  en_US,
  es,
  fi,
  fr,
  fr_LU,
  it,
  ja,
  nb_NO,
  nl,
  nl_BE,
  pt_PT,
  ru,
  sv,
  type LocaleDefinition,
  zh_CN,
} from '@faker-js/faker';
import type { Rng } from '../../lib/rng';
import { generateIban } from '../iban/ibanAccount';
import type { Generated } from '../types';
import { generateUkAccount } from '../uk/ukAccount';
import { generateUsAccount } from '../us/aba';
import { WORLD_COUNTRIES, generateWorldAccount } from '../world/world';
import { toSwiftText } from '../../lib/latin';
import { ISO_ADDRESS_FIELDS, type StructuredAddress, clampAddress } from './isoAddress';
import { type AddressStyle, LATIN_NAMES, pickPlace } from './places';

export interface PersonaCountry {
  code: string;
  name: string;
  locale: LocaleDefinition;
  /** east-asian: family name first, no title or middle name. patronymic: middle name is a patronymic, no title. */
  names?: 'east-asian' | 'patronymic';
}

export const PERSONA_COUNTRIES: PersonaCountry[] = [
  { code: 'GB', name: 'United Kingdom', locale: en_GB },
  { code: 'US', name: 'United States', locale: en_US },
  { code: 'CA', name: 'Canada', locale: en_CA },
  { code: 'AU', name: 'Australia', locale: en_AU },
  { code: 'IE', name: 'Ireland', locale: en_IE },
  { code: 'DE', name: 'Germany', locale: de },
  { code: 'AT', name: 'Austria', locale: de_AT },
  { code: 'CH', name: 'Switzerland', locale: de_CH },
  { code: 'FR', name: 'France', locale: fr },
  { code: 'BE', name: 'Belgium', locale: nl_BE },
  { code: 'NL', name: 'Netherlands', locale: nl },
  { code: 'LU', name: 'Luxembourg', locale: fr_LU },
  { code: 'ES', name: 'Spain', locale: es },
  { code: 'PT', name: 'Portugal', locale: pt_PT },
  { code: 'IT', name: 'Italy', locale: it },
  { code: 'FI', name: 'Finland', locale: fi },
  { code: 'NO', name: 'Norway', locale: nb_NO },
  { code: 'SE', name: 'Sweden', locale: sv },
  { code: 'DK', name: 'Denmark', locale: da },
  { code: 'JP', name: 'Japan', locale: ja, names: 'east-asian' },
  { code: 'CN', name: 'China', locale: zh_CN, names: 'east-asian' },
  { code: 'RU', name: 'Russia', locale: ru, names: 'patronymic' },
];

/** ISO 20022 / CBPR+ structured address, plus the country name for display. */
export type Address = StructuredAddress & { countryName: string };

const GB_BUILDING_NAMES = ['Victoria House', 'Albion Court', 'Kings Court', 'Riverside House', 'The Old Mill', 'Park View'];

export interface Persona {
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  /** Full name in local order. */
  fullName: string;
  sex: 'male' | 'female';
  dateOfBirth: string;
  age: number;
  email: string;
  phone: string;
  address: Address;
}

export interface PersonaOptions {
  country: string;
  minAge?: number;
  maxAge?: number;
  /** Attach a bank account from the matching country generator. */
  withAccount?: boolean;
  /** Latin script only, folded to the SWIFT (CBPR+) character set. */
  latin?: boolean;
}

export interface PersonaResult {
  persona: Persona;
  formattedAddress: string;
  account?: Generated;
  /** Flat form for JSON/CSV export. */
  data: Record<string, string>;
}

/** Reserved example domains (RFC 2606), so generated emails can never reach a real inbox. */
const EMAIL_DOMAINS = ['example.com', 'example.org', 'example.net'];

/** Render a structured address as a local-style postal block. */
export function formatAddress(a: Address, style: AddressStyle): string {
  const street = `${a.buildingNumber} ${a.streetName}`.trim();
  const streetFirst = `${a.streetName} ${a.buildingNumber}`.trim();
  const flat = [a.room, a.floor, a.buildingName].filter(Boolean).join(', ');
  const region = a.countrySubDivision === a.townName ? '' : a.countrySubDivision;
  const lines = {
    gb: [flat, street, a.districtName, a.townName, region, a.postCode],
    us: [street, flat, `${a.townName}, ${region} ${a.postCode}`],
    au: [flat, street, `${a.townName} ${region} ${a.postCode}`],
    ca: [flat, street, `${a.townName} ${region}  ${a.postCode}`],
    fr: [flat, street, `${a.postCode} ${a.townName}`],
    eu: [streetFirst, flat, `${a.postCode} ${a.townName}`],
    it: [streetFirst, flat, `${a.postCode} ${a.townName} ${region}`],
    jp: [`〒${a.postCode}`, `${a.countrySubDivision}${region ? a.townName : ''}${a.districtName}${a.streetName}${a.buildingNumber}`, flat],
    cn: [`${region}${a.townName}${a.districtName}${a.streetName}${a.buildingNumber}`, flat, a.postCode],
    ru: [`${a.streetName}, д. ${a.buildingNumber}`, flat, a.townName, region, a.postCode],
    intl: [street, flat, a.districtName, `${a.townName}${region ? `, ${region}` : ''} ${a.postCode}`],
  }[style];
  return [...lines, a.countryName].map((l) => l.trim()).filter(Boolean).join('\n');
}

export function generatePersona(opts: PersonaOptions, rng: Rng): PersonaResult {
  const country = PERSONA_COUNTRIES.find((c) => c.code === opts.country) ?? PERSONA_COUNTRIES[0];
  const faker = new Faker({ locale: [country.locale, en, base] });
  faker.seed(rng.uint32());

  const sex = faker.person.sexType();
  const firstName = faker.person.firstName(sex);
  const lastName = faker.person.lastName(sex);
  const minAge = opts.minAge ?? 18;
  const maxAge = Math.max(minAge, opts.maxAge ?? 80);
  // Fixed reference date so a seed always yields the same birth date.
  const dob = faker.date.birthdate({ mode: 'age', min: minAge, max: maxAge, refDate: new Date(new Date().toDateString()) });
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);

  const { place, postcode, style, street } = pickPlace(country.code, rng);
  const english = ['gb', 'us', 'au', 'ca'].includes(style);
  const n = (max: number) => faker.number.int({ min: 1, max });
  const buildingNumber =
    style === 'jp' ? `${n(9)}丁目${n(30)}番${n(20)}号` : style === 'cn' ? `${n(300)}号` : String(n(english ? 250 : 120));
  const room = english
    ? faker.datatype.boolean(0.25) ? faker.location.secondaryAddress() : '' // faker only has English-style flat lines
    : style === 'ru'
      ? faker.datatype.boolean(0.6) ? `кв. ${n(200)}` : ''
      : '';
  const address: Address = {
    streetName: street ?? faker.location.street(),
    buildingNumber,
    buildingName: country.code === 'GB' && faker.datatype.boolean(0.15) ? faker.helpers.arrayElement(GB_BUILDING_NAMES) : '',
    floor: '',
    room,
    postCode: postcode,
    townName: place.town,
    townLocationName: '',
    districtName: place.district ?? '',
    countrySubDivision: place.region,
    country: country.code,
    countryName: country.name,
  };

  // faker middle names fall back to English for most locales, so use a second local first name;
  // Russian locale data has proper patronymics.
  const middleName =
    country.names === 'patronymic'
      ? faker.person.middleName(sex)
      : !country.names && faker.datatype.boolean(0.4)
        ? faker.person.firstName(sex)
        : '';
  const fullName =
    country.names === 'east-asian'
      ? `${lastName}${country.code === 'JP' ? ' ' : ''}${firstName}`
      : [firstName, middleName, lastName].filter(Boolean).join(' ');

  const persona: Persona = {
    title: country.names ? '' : faker.person.prefix(sex),
    firstName,
    middleName,
    lastName,
    fullName,
    sex,
    dateOfBirth: dob.toISOString().slice(0, 10),
    age,
    email: faker.internet.email({ firstName, lastName, provider: faker.helpers.arrayElement(EMAIL_DOMAINS) }).toLowerCase(),
    phone: faker.phone.number({ style: 'national' }),
    address,
  };

  let addressStyle = style;
  if (opts.latin) {
    const romanised = LATIN_NAMES[country.code];
    if (romanised) {
      // Japanese and Chinese names can't be transliterated from kanji/hanzi, so pick romanised names instead.
      persona.firstName = faker.helpers.arrayElement(romanised[sex]);
      persona.lastName = faker.helpers.arrayElement(romanised.family);
      persona.fullName = `${persona.firstName} ${persona.lastName}`;
      persona.email = `${persona.firstName}.${persona.lastName}${n(99)}@${faker.helpers.arrayElement(EMAIL_DOMAINS)}`.toLowerCase();
      const latin = place.latin!;
      const nums = buildingNumber.match(/\d+/g) ?? [];
      Object.assign(address, {
        townName: latin.town,
        districtName: latin.district,
        countrySubDivision: latin.region,
        streetName: latin.streets[place.streets!.indexOf(street!)],
        buildingNumber: style === 'jp' ? nums.join('-') : `No. ${nums[0]}`,
      });
    }
    const german = ['DE', 'AT', 'CH', 'LU'].includes(country.code);
    for (const key of ['title', 'firstName', 'middleName', 'lastName', 'fullName'] as const) {
      persona[key] = toSwiftText(persona[key], german);
    }
    for (const f of ISO_ADDRESS_FIELDS) address[f.key] = toSwiftText(address[f.key], german);
    if (style === 'jp' || style === 'cn' || style === 'ru') addressStyle = 'intl';
  }

  Object.assign(address, clampAddress(address));

  let account: Generated | undefined;
  if (opts.withAccount) {
    if (country.code === 'GB') account = generateUkAccount({}, rng);
    else if (country.code === 'US') account = generateUsAccount({}, rng);
    else if (WORLD_COUNTRIES.some((w) => w.code === country.code)) account = generateWorldAccount(country.code, {}, rng);
    else account = generateIban({ country: country.code, bankName: 'any' }, rng);
  }

  const { address: addr, ...rest } = persona;
  const data: Record<string, string> = {
    ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, String(v)])),
    ...Object.fromEntries(Object.entries(addr).map(([k, v]) => [`address.${k}`, v])),
    ...(account ? Object.fromEntries(Object.entries(account.data).map(([k, v]) => [`account.${k}`, v])) : {}),
  };

  return { persona, formattedAddress: formatAddress(address, addressStyle), account, data };
}
