import type { Rng } from '../../lib/rng';

/**
 * Real towns with matching regions and postcode districts, so the town, region
 * and postcode in a generated address agree with each other. Postcode patterns:
 * '#' digit, '?' letter (from the country's allowed set), '*' Eircode character;
 * anything else is literal. A pattern is appended to a randomly picked prefix.
 */
export interface Place {
  /** ISO TwnNm. */
  town: string;
  /** ISO DstrctNm, e.g. a ward or district within a city. */
  district?: string;
  /** ISO CtrySubDvsn. */
  region: string;
  prefixes: string[];
  pattern: string;
  /** Real street / neighbourhood names, used where faker has none for the locale. */
  streets?: string[];
  /** Romanised form for Latin-script personas, with streets in the same order. */
  latin?: { town: string; district: string; region: string; streets: string[] };
}

export type AddressStyle = 'gb' | 'us' | 'au' | 'ca' | 'eu' | 'fr' | 'it' | 'jp' | 'cn' | 'ru' | 'intl';

export interface CountryPlaces {
  style: AddressStyle;
  letters?: string;
  places: Place[];
}

const gb = (town: string, region: string, districts: string[]): Place => ({ town, region, prefixes: districts, pattern: ' #??' });
const fixed = (town: string, region: string, codes: string[]): Place => ({ town, region, prefixes: codes, pattern: '' });
type LatinPlace = [town: string, district: string, region: string, streets: string[]];
const eastAsian =
  (pattern: string) =>
  (town: string, district: string, region: string, prefix: string, streets: string[], [lt, ld, lr, ls]: LatinPlace): Place => ({
    town,
    district,
    region,
    prefixes: [prefix],
    pattern,
    streets,
    latin: { town: lt, district: ld, region: lr, streets: ls },
  });
const jp = eastAsian('##');
const cn = eastAsian('##');

export const PLACES: Record<string, CountryPlaces> = {
  GB: {
    style: 'gb',
    // Inward codes never use C, I, K, M, O or V.
    letters: 'ABDEFGHJLNPQRSTUWXYZ',
    places: [
      gb('London', 'Greater London', ['E1', 'N1', 'SE1', 'SW11', 'W2', 'NW3', 'EC1V']),
      gb('Manchester', 'Greater Manchester', ['M1', 'M4', 'M14', 'M20']),
      gb('Birmingham', 'West Midlands', ['B1', 'B15', 'B29']),
      gb('Leeds', 'West Yorkshire', ['LS1', 'LS6', 'LS17']),
      gb('Sheffield', 'South Yorkshire', ['S1', 'S10', 'S11']),
      gb('Liverpool', 'Merseyside', ['L1', 'L8', 'L17']),
      gb('Newcastle upon Tyne', 'Tyne and Wear', ['NE1', 'NE2', 'NE6']),
      gb('Bristol', 'City of Bristol', ['BS1', 'BS6', 'BS8']),
      gb('Southampton', 'Hampshire', ['SO14', 'SO15', 'SO17']),
      gb('Norwich', 'Norfolk', ['NR1', 'NR2', 'NR4']),
      gb('Cardiff', 'South Glamorgan', ['CF10', 'CF11', 'CF24']),
      gb('Glasgow', 'City of Glasgow', ['G1', 'G12', 'G41']),
      gb('Edinburgh', 'City of Edinburgh', ['EH1', 'EH3', 'EH10']),
      gb('Belfast', 'County Antrim', ['BT1', 'BT7', 'BT9']),
    ],
  },
  US: {
    style: 'us',
    places: [
      { town: 'New York', region: 'NY', prefixes: ['100', '101'], pattern: '##' },
      { town: 'Los Angeles', region: 'CA', prefixes: ['900'], pattern: '##' },
      { town: 'Chicago', region: 'IL', prefixes: ['606'], pattern: '##' },
      { town: 'Houston', region: 'TX', prefixes: ['770'], pattern: '##' },
      { town: 'Phoenix', region: 'AZ', prefixes: ['850'], pattern: '##' },
      { town: 'Philadelphia', region: 'PA', prefixes: ['191'], pattern: '##' },
      { town: 'Seattle', region: 'WA', prefixes: ['981'], pattern: '##' },
      { town: 'Denver', region: 'CO', prefixes: ['802'], pattern: '##' },
      { town: 'Boston', region: 'MA', prefixes: ['021'], pattern: '##' },
      { town: 'Atlanta', region: 'GA', prefixes: ['303'], pattern: '##' },
      { town: 'Miami', region: 'FL', prefixes: ['331'], pattern: '##' },
    ],
  },
  AU: {
    style: 'au',
    places: [
      fixed('Sydney', 'NSW', ['2000', '2010', '2026']),
      fixed('Melbourne', 'VIC', ['3000', '3141']),
      fixed('Brisbane', 'QLD', ['4000', '4101']),
      fixed('Perth', 'WA', ['6000']),
      fixed('Adelaide', 'SA', ['5000']),
      fixed('Hobart', 'TAS', ['7000']),
      fixed('Canberra', 'ACT', ['2600', '2601']),
    ],
  },
  CA: {
    style: 'ca',
    // Canadian postcodes never use D, F, I, O, Q or U.
    letters: 'ABCEGHJKLMNPRSTVWXYZ',
    places: [
      { town: 'Toronto', region: 'ON', prefixes: ['M5V', 'M5H', 'M4W'], pattern: ' #?#' },
      { town: 'Ottawa', region: 'ON', prefixes: ['K1P', 'K2P'], pattern: ' #?#' },
      { town: 'Montréal', region: 'QC', prefixes: ['H2X', 'H3B'], pattern: ' #?#' },
      { town: 'Vancouver', region: 'BC', prefixes: ['V6B', 'V6E'], pattern: ' #?#' },
      { town: 'Calgary', region: 'AB', prefixes: ['T2P', 'T2R'], pattern: ' #?#' },
      { town: 'Halifax', region: 'NS', prefixes: ['B3H', 'B3J'], pattern: ' #?#' },
    ],
  },
  JP: {
    style: 'jp',
    // Tokyo special wards are municipalities in their own right; designated cities have wards as districts.
    places: [
      jp('千代田区', '', '東京都', '100-00', ['丸の内', '大手町', '有楽町'], ['Chiyoda-ku', '', 'Tokyo', ['Marunouchi', 'Otemachi', 'Yurakucho']]),
      jp('渋谷区', '', '東京都', '150-00', ['渋谷', '神南', '恵比寿'], ['Shibuya-ku', '', 'Tokyo', ['Shibuya', 'Jinnan', 'Ebisu']]),
      jp('新宿区', '', '東京都', '160-00', ['西新宿', '歌舞伎町', '四谷'], ['Shinjuku-ku', '', 'Tokyo', ['Nishi-Shinjuku', 'Kabukicho', 'Yotsuya']]),
      jp('大阪市', '北区', '大阪府', '530-00', ['梅田', '中之島', '天神橋'], ['Osaka', 'Kita-ku', 'Osaka', ['Umeda', 'Nakanoshima', 'Tenjinbashi']]),
      jp('京都市', '中京区', '京都府', '604-80', ['烏丸通', '河原町', '御池'], ['Kyoto', 'Nakagyo-ku', 'Kyoto', ['Karasuma-dori', 'Kawaramachi', 'Oike']]),
      jp('横浜市', '中区', '神奈川県', '231-00', ['山下町', '本町', '元町'], ['Yokohama', 'Naka-ku', 'Kanagawa', ['Yamashitacho', 'Honcho', 'Motomachi']]),
      jp('札幌市', '中央区', '北海道', '060-00', ['大通西', '北一条西', '南三条西'], ['Sapporo', 'Chuo-ku', 'Hokkaido', ['Odori-nishi', 'Kita-ichijo-nishi', 'Minami-sanjo-nishi']]),
      jp('福岡市', '博多区', '福岡県', '812-00', ['博多駅前', '中洲', '祇園町'], ['Fukuoka', 'Hakata-ku', 'Fukuoka', ['Hakata-ekimae', 'Nakasu', 'Gionmachi']]),
    ],
  },
  CN: {
    style: 'cn',
    places: [
      cn('北京市', '朝阳区', '北京市', '1000', ['建国路', '朝阳路', '东三环中路'], ['Beijing', 'Chaoyang District', 'Beijing', ['Jianguo Road', 'Chaoyang Road', 'East 3rd Ring Middle Road']]),
      cn('北京市', '海淀区', '北京市', '1000', ['中关村大街', '学院路', '知春路'], ['Beijing', 'Haidian District', 'Beijing', ['Zhongguancun Street', 'Xueyuan Road', 'Zhichun Road']]),
      cn('上海市', '浦东新区', '上海市', '2001', ['世纪大道', '陆家嘴环路', '张杨路'], ['Shanghai', 'Pudong New Area', 'Shanghai', ['Century Avenue', 'Lujiazui Ring Road', 'Zhangyang Road']]),
      cn('上海市', '黄浦区', '上海市', '2000', ['南京东路', '淮海中路', '中山东一路'], ['Shanghai', 'Huangpu District', 'Shanghai', ['East Nanjing Road', 'Middle Huaihai Road', 'East Zhongshan 1st Road']]),
      cn('广州市', '天河区', '广东省', '5106', ['天河路', '体育西路', '珠江新城'], ['Guangzhou', 'Tianhe District', 'Guangdong', ['Tianhe Road', 'Tiyu West Road', 'Zhujiang New Town']]),
      cn('深圳市', '福田区', '广东省', '5180', ['深南大道', '福华路', '益田路'], ['Shenzhen', 'Futian District', 'Guangdong', ['Shennan Avenue', 'Fuhua Road', 'Yitian Road']]),
      cn('杭州市', '西湖区', '浙江省', '3100', ['文三路', '天目山路', '北山路'], ['Hangzhou', 'Xihu District', 'Zhejiang', ['Wensan Road', 'Tianmushan Road', 'Beishan Road']]),
      cn('成都市', '锦江区', '四川省', '6100', ['春熙路', '红星路', '东大街'], ['Chengdu', 'Jinjiang District', 'Sichuan', ['Chunxi Road', 'Hongxing Road', 'Dongda Street']]),
    ],
  },
  RU: {
    style: 'ru',
    places: [
      { town: 'Москва', region: 'Москва', prefixes: ['1010', '1150', '1230'], pattern: '##' },
      { town: 'Санкт-Петербург', region: 'Санкт-Петербург', prefixes: ['1900', '1910', '1970'], pattern: '##' },
      { town: 'Новосибирск', region: 'Новосибирская область', prefixes: ['6300'], pattern: '##' },
      { town: 'Екатеринбург', region: 'Свердловская область', prefixes: ['6200'], pattern: '##' },
      { town: 'Казань', region: 'Республика Татарстан', prefixes: ['4200'], pattern: '##' },
    ],
  },
  IE: {
    style: 'gb',
    places: [
      { town: 'Dublin', region: 'Co. Dublin', prefixes: ['D02', 'D04', 'D06', 'D08'], pattern: ' ****' },
      { town: 'Cork', region: 'Co. Cork', prefixes: ['T12', 'T23'], pattern: ' ****' },
      { town: 'Galway', region: 'Co. Galway', prefixes: ['H91'], pattern: ' ****' },
      { town: 'Limerick', region: 'Co. Limerick', prefixes: ['V94'], pattern: ' ****' },
      { town: 'Waterford', region: 'Co. Waterford', prefixes: ['X91'], pattern: ' ****' },
    ],
  },
  DE: {
    style: 'eu',
    places: [
      { town: 'Berlin', region: 'Berlin', prefixes: ['10', '12', '13'], pattern: '###' },
      { town: 'Hamburg', region: 'Hamburg', prefixes: ['20', '22'], pattern: '###' },
      { town: 'München', region: 'Bayern', prefixes: ['80', '81'], pattern: '###' },
      { town: 'Köln', region: 'Nordrhein-Westfalen', prefixes: ['50', '51'], pattern: '###' },
      { town: 'Frankfurt am Main', region: 'Hessen', prefixes: ['60'], pattern: '###' },
      { town: 'Stuttgart', region: 'Baden-Württemberg', prefixes: ['70'], pattern: '###' },
      { town: 'Düsseldorf', region: 'Nordrhein-Westfalen', prefixes: ['40'], pattern: '###' },
      { town: 'Leipzig', region: 'Sachsen', prefixes: ['04'], pattern: '###' },
    ],
  },
  AT: {
    style: 'eu',
    places: [
      fixed('Wien', 'Wien', ['1010', '1020', '1030', '1070', '1090', '1180']),
      fixed('Graz', 'Steiermark', ['8010', '8020']),
      fixed('Linz', 'Oberösterreich', ['4020']),
      fixed('Salzburg', 'Salzburg', ['5020']),
      fixed('Innsbruck', 'Tirol', ['6020']),
    ],
  },
  CH: {
    style: 'eu',
    places: [
      fixed('Zürich', 'ZH', ['8001', '8004', '8032']),
      fixed('Genève', 'GE', ['1201', '1205']),
      fixed('Basel', 'BS', ['4051', '4056']),
      fixed('Bern', 'BE', ['3011', '3012']),
      fixed('Lausanne', 'VD', ['1003', '1004']),
      fixed('Luzern', 'LU', ['6003', '6004']),
    ],
  },
  FR: {
    style: 'fr',
    places: [
      fixed('Paris', 'Île-de-France', ['75001', '75008', '75011', '75015', '75017', '75020']),
      fixed('Lyon', 'Auvergne-Rhône-Alpes', ['69001', '69003', '69006']),
      fixed('Marseille', "Provence-Alpes-Côte d'Azur", ['13001', '13006', '13008']),
      fixed('Toulouse', 'Occitanie', ['31000']),
      fixed('Nice', "Provence-Alpes-Côte d'Azur", ['06000']),
      fixed('Bordeaux', 'Nouvelle-Aquitaine', ['33000']),
      fixed('Lille', 'Hauts-de-France', ['59000']),
      fixed('Nantes', 'Pays de la Loire', ['44000']),
    ],
  },
  BE: {
    style: 'eu',
    places: [
      fixed('Brussel', 'Brussels Hoofdstedelijk Gewest', ['1000']),
      fixed('Antwerpen', 'Antwerpen', ['2000', '2018']),
      fixed('Gent', 'Oost-Vlaanderen', ['9000']),
      fixed('Brugge', 'West-Vlaanderen', ['8000']),
      fixed('Leuven', 'Vlaams-Brabant', ['3000']),
    ],
  },
  NL: {
    style: 'eu',
    letters: 'ABCDEGHJKLMNPRTVWXZ',
    places: [
      { town: 'Amsterdam', region: 'Noord-Holland', prefixes: ['101', '105', '107'], pattern: '# ??' },
      { town: 'Rotterdam', region: 'Zuid-Holland', prefixes: ['301', '303', '306'], pattern: '# ??' },
      { town: 'Den Haag', region: 'Zuid-Holland', prefixes: ['251', '256'], pattern: '# ??' },
      { town: 'Utrecht', region: 'Utrecht', prefixes: ['351', '356'], pattern: '# ??' },
      { town: 'Eindhoven', region: 'Noord-Brabant', prefixes: ['561', '562'], pattern: '# ??' },
    ],
  },
  LU: {
    style: 'fr',
    places: [
      { town: 'Luxembourg', region: 'Luxembourg', prefixes: ['L-1', 'L-2'], pattern: '###' },
      { town: 'Esch-sur-Alzette', region: 'Esch-sur-Alzette', prefixes: ['L-40', 'L-41'], pattern: '##' },
      { town: 'Differdange', region: 'Esch-sur-Alzette', prefixes: ['L-45'], pattern: '##' },
    ],
  },
  ES: {
    style: 'eu',
    places: [
      { town: 'Madrid', region: 'Madrid', prefixes: ['280'], pattern: '##' },
      { town: 'Barcelona', region: 'Barcelona', prefixes: ['080'], pattern: '##' },
      { town: 'Valencia', region: 'Valencia', prefixes: ['460'], pattern: '##' },
      { town: 'Sevilla', region: 'Sevilla', prefixes: ['410'], pattern: '##' },
      { town: 'Bilbao', region: 'Bizkaia', prefixes: ['480'], pattern: '##' },
      { town: 'Málaga', region: 'Málaga', prefixes: ['290'], pattern: '##' },
    ],
  },
  PT: {
    style: 'eu',
    places: [
      { town: 'Lisboa', region: 'Lisboa', prefixes: ['10', '11', '12'], pattern: '##-###' },
      { town: 'Porto', region: 'Porto', prefixes: ['40', '41'], pattern: '##-###' },
      { town: 'Braga', region: 'Braga', prefixes: ['47'], pattern: '##-###' },
      { town: 'Coimbra', region: 'Coimbra', prefixes: ['30'], pattern: '##-###' },
      { town: 'Faro', region: 'Faro', prefixes: ['80'], pattern: '##-###' },
    ],
  },
  IT: {
    style: 'it',
    places: [
      { town: 'Roma', region: 'RM', prefixes: ['001'], pattern: '##' },
      { town: 'Milano', region: 'MI', prefixes: ['201'], pattern: '##' },
      { town: 'Napoli', region: 'NA', prefixes: ['801'], pattern: '##' },
      { town: 'Torino', region: 'TO', prefixes: ['101'], pattern: '##' },
      { town: 'Firenze', region: 'FI', prefixes: ['501'], pattern: '##' },
      { town: 'Bologna', region: 'BO', prefixes: ['401'], pattern: '##' },
    ],
  },
  FI: {
    style: 'eu',
    places: [
      { town: 'Helsinki', region: 'Uusimaa', prefixes: ['001', '005'], pattern: '#0' },
      { town: 'Espoo', region: 'Uusimaa', prefixes: ['021', '022'], pattern: '#0' },
      { town: 'Tampere', region: 'Pirkanmaa', prefixes: ['331'], pattern: '#0' },
      { town: 'Turku', region: 'Varsinais-Suomi', prefixes: ['201'], pattern: '#0' },
      { town: 'Oulu', region: 'Pohjois-Pohjanmaa', prefixes: ['901'], pattern: '#0' },
    ],
  },
  NO: {
    style: 'eu',
    places: [
      { town: 'Oslo', region: 'Oslo', prefixes: ['01', '02', '04'], pattern: '##' },
      { town: 'Bergen', region: 'Vestland', prefixes: ['50'], pattern: '##' },
      { town: 'Trondheim', region: 'Trøndelag', prefixes: ['70'], pattern: '##' },
      { town: 'Stavanger', region: 'Rogaland', prefixes: ['40'], pattern: '##' },
    ],
  },
  SE: {
    style: 'eu',
    places: [
      { town: 'Stockholm', region: 'Stockholms län', prefixes: ['11'], pattern: '# ##' },
      { town: 'Göteborg', region: 'Västra Götalands län', prefixes: ['41'], pattern: '# ##' },
      { town: 'Malmö', region: 'Skåne län', prefixes: ['21'], pattern: '# ##' },
      { town: 'Uppsala', region: 'Uppsala län', prefixes: ['75'], pattern: '# ##' },
    ],
  },
  DK: {
    style: 'eu',
    places: [
      fixed('København K', 'Region Hovedstaden', ['1050', '1150', '1250', '1360']),
      fixed('Aarhus C', 'Region Midtjylland', ['8000']),
      fixed('Odense C', 'Region Syddanmark', ['5000']),
      fixed('Aalborg', 'Region Nordjylland', ['9000']),
    ],
  },
};

/** Romanised given and family names for Latin-script Japanese and Chinese personas. */
export const LATIN_NAMES: Record<string, { family: string[]; male: string[]; female: string[] }> = {
  JP: {
    family: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Matsumoto', 'Inoue'],
    male: ['Haruto', 'Yuto', 'Sota', 'Ren', 'Hiroshi', 'Takashi', 'Kenji', 'Daiki', 'Shota', 'Kazuki', 'Takumi', 'Kenta'],
    female: ['Yui', 'Aoi', 'Hina', 'Yuki', 'Sakura', 'Emi', 'Mei', 'Rin', 'Haruka', 'Misaki', 'Ayaka', 'Nanami'],
  },
  CN: {
    family: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu'],
    male: ['Wei', 'Qiang', 'Lei', 'Jun', 'Yong', 'Jie', 'Tao', 'Ming', 'Hao', 'Bo', 'Zhiwei', 'Jianguo'],
    female: ['Fang', 'Na', 'Min', 'Jing', 'Li', 'Yan', 'Xiuying', 'Ting', 'Hui', 'Xin', 'Yuting', 'Meiling'],
  },
};

const EIRCODE_CHARS ='ACDEFHKNPRTVWXY0123456789';
const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function pickPlace(
  countryCode: string,
  rng: Rng,
): { place: Place; postcode: string; style: AddressStyle; street?: string } {
  const country = PLACES[countryCode];
  const place = rng.pick(country.places);
  const letters = [...(country.letters ?? ALL_LETTERS)];
  const suffix = [...place.pattern]
    .map((ch) =>
      ch === '#' ? String(rng.int(0, 9)) : ch === '?' ? rng.pick(letters) : ch === '*' ? rng.pick([...EIRCODE_CHARS]) : ch,
    )
    .join('');
  return {
    place,
    postcode: rng.pick(place.prefixes) + suffix,
    style: country.style,
    street: place.streets ? rng.pick(place.streets) : undefined,
  };
}
