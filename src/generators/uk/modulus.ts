import { MODULUS_RULES, SORT_CODE_SUBSTITUTIONS, type ModulusRule } from './modulusData';

/**
 * UK account validation per Vocalink "Validating account numbers" (modulus checking),
 * including exceptions 1–14.
 */

export interface ModulusResult {
  valid: boolean;
  /** False when the sort code has no entry in the weight table, so it can't be checked (treated as valid). */
  checkable: boolean;
  methods: string[];
  reason: string;
}

const digitsOf = (s: string) => s.split('').map(Number);
const mod = (n: number, m: number) => ((n % m) + m) % m;

export function normaliseSortCode(sortCode: string): string {
  return sortCode.replace(/[\s-]/g, '');
}

const ruleCache = new Map<string, ModulusRule[]>();

export function findRules(sortCode: string, rules: ModulusRule[] = MODULUS_RULES): ModulusRule[] {
  const cached = rules === MODULUS_RULES ? ruleCache.get(sortCode) : undefined;
  if (cached) return cached;
  const sc = Number(sortCode);
  const matched = rules.filter((r) => r.start <= sc && sc <= r.end);
  if (rules === MODULUS_RULES) ruleCache.set(sortCode, matched);
  return matched;
}

function weightedTotal(number: number[], weights: number[], method: string): number {
  let total = 0;
  for (let i = 0; i < 14; i++) {
    const product = number[i] * weights[i];
    total += method === 'DBLAL' ? digitsOf(String(product)).reduce((a, b) => a + b, 0) : product;
  }
  return total;
}

function runCheck(rule: ModulusRule, sortCode: string, account: string): boolean {
  let sc = sortCode;
  let acc = account;
  let weights = [...rule.weights];
  const ex = rule.exception;

  if (ex === 5) sc = SORT_CODE_SUBSTITUTIONS.get(sc) ?? sc;
  if (ex === 8) sc = '090126';
  if (ex === 9) sc = '309634';

  // Account positions: a=0 b=1 c=2 d=3 e=4 f=5 g=6 h=7.
  const a = Number(acc[0]);
  const g = Number(acc[6]);
  if (ex === 2) {
    if (a !== 0 && g !== 9) weights = [0, 0, 1, 2, 5, 3, 6, 4, 8, 7, 10, 9, 3, 1];
    else if (a !== 0 && g === 9) weights = [0, 0, 0, 0, 0, 0, 0, 0, 8, 7, 10, 9, 3, 1];
  }
  if (ex === 7 && g === 9) weights.fill(0, 0, 8);
  if (ex === 10 && (acc.startsWith('09') || acc.startsWith('99')) && g === 9) weights.fill(0, 0, 8);

  const number = digitsOf(sc + acc);
  let total = weightedTotal(number, weights, rule.method);
  if (ex === 1) total += 27;

  if (ex === 4) return mod(total, 11) === Number(acc.slice(6, 8));
  if (ex === 5) {
    if (rule.method === 'MOD11') {
      const r = mod(total, 11);
      if (r === 0) return g === 0;
      if (r === 1) return false;
      return 11 - r === g;
    }
    const r = mod(total, 10);
    const h = Number(acc[7]);
    return r === 0 ? h === 0 : 10 - r === h;
  }

  const m = rule.method === 'MOD11' ? 11 : 10;
  if (mod(total, m) === 0) return true;

  if (ex === 14) {
    const h = acc[7];
    if (!['0', '1', '9'].includes(h)) return false;
    acc = '0' + acc.slice(0, 7);
    return mod(weightedTotal(digitsOf(sc + acc), rule.weights, rule.method), 11) === 0;
  }
  return false;
}

export function validateUkAccount(
  sortCodeInput: string,
  accountInput: string,
  rules: ModulusRule[] = MODULUS_RULES,
): ModulusResult {
  const sortCode = normaliseSortCode(sortCodeInput);
  const account = accountInput.replace(/\s/g, '');
  if (!/^\d{6}$/.test(sortCode)) return { valid: false, checkable: false, methods: [], reason: 'Sort code must be 6 digits' };
  if (!/^\d{8}$/.test(account)) return { valid: false, checkable: false, methods: [], reason: 'Account number must be 8 digits' };

  const matched = findRules(sortCode, rules);
  if (matched.length === 0) {
    return { valid: true, checkable: false, methods: [], reason: 'Sort code not in modulus table, so the account number cannot be checked' };
  }
  const methods = matched.map((r) => r.method + (r.exception ? ` (ex ${r.exception})` : ''));
  const [first, second] = matched;

  if (first.exception === 6 && '45678'.includes(account[0]) && account[6] === account[7]) {
    return { valid: true, checkable: true, methods, reason: 'Exception 6: foreign currency account, no check required' };
  }

  const firstOk = runCheck(first, sortCode, account);
  const result = (valid: boolean, reason: string): ModulusResult => ({ valid, checkable: true, methods, reason });

  if (!second) return firstOk ? result(true, `Passed ${methods[0]}`) : result(false, `Failed ${methods[0]}`);

  // Pairs where passing either check is enough.
  if (first.exception === 2 || first.exception === 10 || first.exception === 12) {
    if (firstOk) return result(true, `Passed ${methods[0]}`);
    return runCheck(second, sortCode, account)
      ? result(true, `Failed first check, passed ${methods[1]}`)
      : result(false, 'Failed both checks');
  }

  if (!firstOk) return result(false, `Failed ${methods[0]}`);
  if (second.exception === 3 && (account[2] === '6' || account[2] === '9')) {
    return result(true, `Passed ${methods[0]}; second check skipped (exception 3)`);
  }
  return runCheck(second, sortCode, account)
    ? result(true, `Passed ${methods.join(' and ')}`)
    : result(false, `Passed ${methods[0]}, failed ${methods[1]}`);
}
