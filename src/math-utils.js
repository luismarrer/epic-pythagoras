/**
 * Greatest Common Divisor (GCD) / Máximo Común Divisor (MCD)
 * Using the Euclidean algorithm.
 */
export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

/**
 * Least Common Multiple (LCM) / Mínimo Común Múltiplo (MCM)
 */
export function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * LCM of an array of numbers
 */
export function lcmArray(numbers) {
  if (numbers.length === 0) return 1;
  return numbers.reduce((acc, val) => lcm(acc, val), numbers[0]);
}

/**
 * Prime factorization of a number
 * Returns an object with prime factors as keys and exponents as values.
 */
export function getPrimeFactorization(n) {
  n = Math.abs(n);
  const factors = {};
  if (n <= 1) return factors;
  
  let d = 2;
  while (n >= d * d) {
    if (n % d === 0) {
      factors[d] = (factors[d] || 0) + 1;
      n /= d;
    } else {
      d++;
    }
  }
  if (n > 1) {
    factors[n] = (factors[n] || 0) + 1;
  }
  return factors;
}

/**
 * Generates the division table steps to find the LCM (MCM) of an array of numbers.
 * Similar to the grid method used in schools:
 * 
 * Divisor | A   B   C
 * -------------------
 *    2    | 4   6   9
 *    2    | 2   3   9
 *    3    | 1   3   9
 *    3    | 1   1   3
 *         | 1   1   1
 * 
 * Returns: { rows: Array<{ divisor: number, values: number[] }>, divisors: number[], lcmValue: number }
 */
export function getLcmGridSteps(numbers) {
  const nums = numbers.map(n => Math.abs(n)).filter(n => n > 0);
  if (nums.length === 0) return { rows: [], divisors: [], lcmValue: 0 };
  
  const original = [...nums];
  const rows = [];
  const divisors = [];
  let current = [...nums];
  
  // Keep dividing until all numbers become 1
  while (current.some(n => n > 1)) {
    // Find the smallest prime divisor that divides at least one number
    let divisor = 2;
    while (true) {
      if (current.some(n => n % divisor === 0)) {
        break;
      }
      divisor++;
    }
    
    // Add current row
    rows.push({
      divisor,
      values: [...current]
    });
    divisors.push(divisor);
    
    // Divide the numbers that are divisible, keep others same
    current = current.map(n => (n % divisor === 0 ? n / divisor : n));
  }
  
  // Add final row of all 1s
  rows.push({
    divisor: null,
    values: [...current]
  });
  
  const lcmValue = divisors.reduce((a, b) => a * b, 1);
  
  return {
    original,
    rows,
    divisors,
    lcmValue
  };
}
