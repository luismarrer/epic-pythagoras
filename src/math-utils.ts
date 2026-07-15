/**
 * Greatest Common Divisor (GCD) / Máximo Común Divisor (MCD)
 * Using the Euclidean algorithm.
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Least Common Multiple (LCM) / Mínimo Común Múltiplo (MCM)
 */
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * LCM of an array of numbers
 */
export function lcmArray(numbers: readonly number[]): number {
  if (numbers.length === 0) return 1;
  return numbers.reduce((acc, value) => lcm(acc, value));
}

/**
 * Prime factorization of a number.
 * Returns a map of prime factor → exponent.
 */
export function getPrimeFactorization(n: number): Map<number, number> {
  n = Math.abs(n);
  const factors = new Map<number, number>();
  if (n <= 1) return factors;

  let d = 2;
  while (n >= d * d) {
    if (n % d === 0) {
      factors.set(d, (factors.get(d) ?? 0) + 1);
      n /= d;
    } else {
      d++;
    }
  }
  if (n > 1) {
    factors.set(n, (factors.get(n) ?? 0) + 1);
  }
  return factors;
}

export interface LcmGridRow {
  /** Prime divisor applied to this row; null on the final all-ones row */
  divisor: number | null;
  values: number[];
}

export interface LcmGrid {
  original: number[];
  rows: LcmGridRow[];
  divisors: number[];
  lcmValue: number;
}

/**
 * Generates the division table steps to find the LCM (MCM) of an array of
 * numbers — the grid method used in schools:
 *
 *   A   B   C | Divisor
 *   ------------------
 *   4   6   9 |   2
 *   2   3   9 |   2
 *   1   3   9 |   3
 *   1   1   3 |   3
 *   1   1   1 |
 */
export function getLcmGridSteps(numbers: readonly number[]): LcmGrid {
  const nums = numbers.map(n => Math.abs(n)).filter(n => n > 0);
  if (nums.length === 0) return { original: [], rows: [], divisors: [], lcmValue: 0 };

  const original = [...nums];
  const rows: LcmGridRow[] = [];
  const divisors: number[] = [];
  let current = [...nums];

  // Keep dividing until all numbers become 1. The smallest integer ≥ 2 that
  // divides at least one remaining number is always prime.
  while (current.some(n => n > 1)) {
    let divisor = 2;
    while (!current.some(n => n % divisor === 0)) {
      divisor++;
    }

    rows.push({ divisor, values: [...current] });
    divisors.push(divisor);
    current = current.map(n => (n % divisor === 0 ? n / divisor : n));
  }

  rows.push({ divisor: null, values: [...current] });

  const lcmValue = divisors.reduce((a, b) => a * b, 1);

  return { original, rows, divisors, lcmValue };
}
