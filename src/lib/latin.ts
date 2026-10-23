/**
 * Latin-script helpers for SWIFT-safe text. CBPR+ names and addresses only allow
 * [0-9a-zA-Z/-?:().,'+ ] plus !#$&%*=^_`{|}~";<>@[\] — no accents or other scripts.
 */

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: 'ie', ы: 'y', ь: '', э: 'e', ю: 'iu', я: 'ia',
};

const SPECIAL: Record<string, string> = {
  ß: 'ss', ø: 'o', Ø: 'O', æ: 'ae', Æ: 'AE', œ: 'oe', Œ: 'OE', ł: 'l', Ł: 'L', đ: 'd', Đ: 'D', þ: 'th', Þ: 'Th',
  ð: 'd', ı: 'i', '’': "'", '‘': "'", '«': '"', '»': '"', '–': '-', '—': '-', '№': 'No.',
};

/** Transliterate Cyrillic (ICAO 9303 style) to Latin, keeping capitalisation. */
export function transliterateCyrillic(s: string): string {
  return s.replace(/[А-яЁё]/g, (ch) => {
    const lower = ch.toLowerCase();
    const latin = CYRILLIC[lower] ?? '';
    return ch === lower ? latin : latin.charAt(0).toUpperCase() + latin.slice(1);
  });
}

const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue' };

const NOT_SWIFT_EXTENDED = /[^0-9a-zA-Z/\-?:().,'+ !#$%&*=^_`{|}~";<>@[\\\]]/g;

/**
 * Fold to the CBPR+ extended character set: transliterate, strip accents, drop anything else.
 * `germanUmlauts` writes ä/ö/ü as ae/oe/ue (the German convention) rather than dropping the dots.
 */
export function toSwiftText(s: string, germanUmlauts = false): string {
  const folded = germanUmlauts ? s.replace(/[äöüÄÖÜ]/g, (ch) => UMLAUTS[ch]) : s;
  return transliterateCyrillic(folded)
    .replace(/[ßøØæÆœŒłŁđĐþÞðı’‘«»–—№]/g, (ch) => SPECIAL[ch])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(NOT_SWIFT_EXTENDED, '')
    .replace(/\s+/g, ' ')
    .trim();
}
