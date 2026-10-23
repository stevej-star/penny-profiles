# PennyProfiles

A local web app that generates **valid-looking bank account details and personas for testing**. Every value passes the same checks real systems run, using real bank identifiers. It is test data only: never use it for real payments.

## Features

| Tab | What it generates | Validation applied |
|---|---|---|
| **UK (FPS / CHAPS)** | Sort code + 8-digit account number, BIC, GB IBAN for a chosen bank (Barclays, HSBC, Lloyds, NatWest, RBS, Santander, Halifax, Nationwide, Starling, Monzo, …) | Full Vocalink modulus checking (MOD10, MOD11, DBLAL, exceptions 1–14) |
| **US (ACH / Wire)** | Real ABA routing numbers for well-known banks, plus account number and type | ABA 3-7-1 checksum |
| **IBAN** | 36 IBAN countries (EUR, CH, NO, SE, DK, PL, …) with real bank codes and BICs where bundled | Mod-97, plus national check digits for FR, MC, ES, IT, SM, BE, NO, PT, FI |
| **AU · CA · JP · CN · RU** | Australia: BSB + account. Canada: institution, transit, EFT routing, //CC clearing code. Japan: Zengin bank/branch/type/account, including Japan Post Bank 記号/番号 conversion. China: UnionPay card account + CNAPS. Russia: BIK, correspondent account, account with control key. Real banks and BICs for each | China: Luhn. Russia: BIK-keyed control digit. AU, CA and JP have no published account checksum |
| **Persona** | Name, DOB in an age range, email (reserved `example.*` domains), phone, an **ISO 20022 / CBPR+ structured address** (StrtNm, BldgNb, BldgNm, Room, PstCd, TwnNm, DstrctNm, CtrySubDvsn, Ctry, with schema maximum lengths) built from a real town, district, region and matching postcode district, and an optional linked account. The tab shows the ISO fields, copies a `<PstlAdr>` block, and flags anything that is not SWIFT-safe | Field lengths, mandatory TwnNm and Ctry, and the CBPR+ character set (needs Latin script for non-Latin countries) |
| **pacs.008** | CBPR+ pacs.008.001.08 (SR2025) customer credit transfers between a random Starling customer and a random persona, **inbound** (persona → Starling) or **outbound** (Starling → persona), with a choice of currency, amount and charge bearer (SHAR / DEBT / CRED) | Validated against the Swift CBPR+ XSD in the test suite (see below) |
| **Validator** | Checks a sort code + account, an IBAN or a routing number and explains why it passes or fails | — |
| **Bulk export** | Up to 10,000 rows of any generator as CSV or JSON | — |

Each generator can also produce deliberately **invalid** values for negative tests, wherever a checksum exists.

The account tabs have a **Details** selector to show local (domestic) details, international (SWIFT) details, or both. Personas cover the same countries and use each country's naming and address conventions. Japanese and Chinese personas put the family name first, Russian personas have patronymics, and Japanese addresses use 〒 + 丁目番号.

The seed and options live in the URL hash, so any result can be bookmarked, shared and reproduced exactly.

## Running

With Docker (serves on http://localhost:8080):

```bash
docker compose up --build -d
```

For development (Node 20+):

```bash
npm install
npm run dev
```

To run the tests:

```bash
npm test
```

The Docker build runs the test suite and fails if any test fails.

## pacs.008 schema validation

`src/generators/pacs008/pacs008.test.ts` can validate every country and direction with `xmllint` against the CBPR+ `pacs.008.001.08.xsd`. That XSD is a licensed Swift MyStandards file, so it isn't committed. Provide it in either of two ways:

- **Default:** drop it into `schemas/pacs.008.001.08.xsd`. `*.xsd` files there are git-ignored and excluded from the Docker build.
- **Elsewhere:** point `PACS008_XSD` at it:

```bash
PACS008_XSD=/path/to/pacs.008.001.08.xsd npm test
```

If the file or `xmllint` isn't available (for example inside the Docker build), the schema tests are skipped and every other test still runs.

CBPR+ only allows `[0-9a-zA-Z/-?:().,'+ ]`, plus a few symbols, in names and addresses. So pacs.008 parties use **Latin-script personas**: accents are folded (German umlauts become ae/oe/ue), Cyrillic is transliterated, and Japanese and Chinese personas use romanised names and places. The same mode is available on the Persona tab as "Latin script (SWIFT-safe)".

## Data

- `src/data/vocalink/valacdos.txt` and `scsubtab.txt`: the Vocalink modulus weight table and sort code substitution table. To refresh them, download the latest from https://www.vocalink.com/tools/modulus-checking/ and replace the files. The tests in `src/generators/uk/modulus.test.ts` (the published spec test cases) must still pass.
- `src/data/banks/uk.json`: UK banks with their BIC and either sort code ranges (the big banks) or specific sort codes (Starling, Monzo, Revolut, Metro). Generated sort codes are drawn only from parts of a range that appear in the Vocalink table, so they are always modulus-checkable. They are real allocations, but an individual branch code may not be active.
- `src/data/banks/us.json`: published routing numbers for major US banks. A test checks every one against the ABA checksum.
- `src/data/banks/world.json`: Australian, Canadian, Japanese, Chinese and Russian banks (BSB prefixes, institution numbers, Zengin codes, CNAPS prefixes and card BINs, BIKs and correspondent accounts). A test checks every Russian correspondent account against its BIK.
- `src/data/banks/iban.json`: national bank codes and BICs per country. Branch and account digits are random.
- `src/generators/persona/places.ts`: real towns with matching regions and postcode districts.

Bank lists are curated from public sources. Spot-check a code before relying on it for anything routing-sensitive.

## Known limitations

- German account numbers satisfy the IBAN checksum but not the bank-specific *Prüfziffer* methods (there are over 100 of them).
- Dutch "elfproef", Swedish and Danish account-level checks aren't applied. They aren't consistently used by all banks.
- China CNAPS codes have the right bank prefix and city code, but their final check digit isn't modelled.
- Native-script Japanese and Chinese personas have random email local parts. Latin mode uses romanised names from a short curated list.
- The rest of a UK or EU postcode after the district or prefix is random. It matches the format but may not be a delivered postcode.
