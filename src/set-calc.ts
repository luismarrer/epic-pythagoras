import { parseSet, formatSet, texSet, escapeHtml, sortElements } from './set-parser';

// Re-export parser helpers so controllers can import everything set-related from here
export { parseSet, formatSet, texSet, escapeHtml, sortElements };

export type StringSet = ReadonlySet<string>;

/**
 * Binary set operations
 */
export function union(setA: StringSet, setB: StringSet): Set<string> {
  return new Set([...setA, ...setB]);
}

export function intersection(setA: StringSet, setB: StringSet): Set<string> {
  return new Set([...setA].filter(x => setB.has(x)));
}

export function difference(setA: StringSet, setB: StringSet): Set<string> {
  return new Set([...setA].filter(x => !setB.has(x)));
}

export function symmetricDifference(setA: StringSet, setB: StringSet): Set<string> {
  return union(difference(setA, setB), difference(setB, setA));
}

/**
 * N-ary variants (used when the calculator works with more than two sets).
 * Symmetric difference folds left; since Δ is associative the result contains
 * the elements present in an odd number of sets.
 */
export function unionAll(sets: readonly StringSet[]): Set<string> {
  return sets.reduce<Set<string>>((acc, set) => union(acc, set), new Set());
}

export function intersectionAll(sets: readonly StringSet[]): Set<string> {
  if (sets.length === 0) return new Set();
  return sets.slice(1).reduce<Set<string>>((acc, set) => intersection(acc, set), new Set(sets[0]));
}

export function symmetricDifferenceAll(sets: readonly StringSet[]): Set<string> {
  if (sets.length === 0) return new Set();
  return sets.slice(1).reduce<Set<string>>((acc, set) => symmetricDifference(acc, set), new Set(sets[0]));
}

/**
 * Cartesian product of any number of sets. Returns an array of tuples,
 * preserving each set's insertion order.
 */
export function cartesianProduct(...sets: StringSet[]): string[][] {
  if (sets.length === 0) return [];
  return sets.reduce<string[][]>(
    (tuples, set) => tuples.flatMap(tuple => [...set].map(x => [...tuple, x])),
    [[]]
  );
}

export function isSubset(setA: StringSet, setB: StringSet): boolean {
  if (setA.size > setB.size) return false;
  for (const x of setA) {
    if (!setB.has(x)) return false;
  }
  return true;
}

export function areDisjoint(setA: StringSet, setB: StringSet): boolean {
  for (const x of setA) {
    if (setB.has(x)) return false;
  }
  return true;
}
