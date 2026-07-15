/**
 * Set Parser Utility
 * Parses a string input into a Set of values.
 * Supports:
 * - Comma separated lists: "1, 2, 3"
 * - Space separated lists: "1 2 3"
 * - Ranges of numbers: "1-5", "10..15"
 * - Ranges of letters: "a-e", "A-E"
 */

const MAX_NUMERIC_RANGE = 100; // limit range size to avoid huge sets
const MAX_ALPHA_RANGE = 52;

export function parseSet(str: string): Set<string> {
  if (!str) return new Set();

  const items: string[] = [];
  const parts = str.split(/[\s,]+/);

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    // 1. Numerical range (e.g. "1-5" or "1..5")
    const numRange = part.match(/^(\d+)(?:-|\.\.)(\d+)$/);
    if (numRange) {
      const start = parseInt(numRange[1]!, 10);
      const end = parseInt(numRange[2]!, 10);

      if (start <= end && end - start <= MAX_NUMERIC_RANGE) {
        for (let i = start; i <= end; i++) items.push(String(i));
      } else {
        // Range too large or inverted: treat as a literal token
        items.push(part);
      }
      continue;
    }

    // 2. Alphabetical range (e.g. "a-e" or "A-Z"), same case only
    const alphaRange = part.match(/^([a-zA-Z])(?:-|\.\.)([a-zA-Z])$/);
    if (alphaRange) {
      const startCode = alphaRange[1]!.charCodeAt(0);
      const endCode = alphaRange[2]!.charCodeAt(0);

      const sameCase = (startCode >= 97 && endCode >= 97) || (startCode <= 90 && endCode <= 90);
      if (startCode <= endCode && endCode - startCode <= MAX_ALPHA_RANGE && sameCase) {
        for (let i = startCode; i <= endCode; i++) items.push(String.fromCharCode(i));
      } else {
        items.push(part);
      }
      continue;
    }

    // 3. Plain token
    items.push(part);
  }

  return new Set(items);
}

/**
 * Sort set elements for display: numbers numerically, everything else
 * alphabetically. Returns a new array.
 */
export function sortElements(set: Iterable<string>): string[] {
  return Array.from(set).sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });
}

// Elements come from user input and get injected via innerHTML
export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Format set output as pretty mathematical set notation: {a, b, c}
 */
export function formatSet(set: Set<string>): string {
  if (set.size === 0) return '∅ (Conjunto Vacío)';
  return `{ ${sortElements(set).map(escapeHtml).join(', ')} }`;
}

/**
 * Same notation but TeX-safe, for use inside MathJax \( ... \) delimiters
 * (braces must be escaped or TeX swallows them as grouping).
 */
export function texSet(set: Set<string>): string {
  if (set.size === 0) return '\\emptyset';
  return `\\{ ${sortElements(set).map(escapeHtml).join(', ')} \\}`;
}
