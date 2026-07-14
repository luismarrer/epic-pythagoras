/**
 * Set Parser Utility
 * Parses a string input into a Set of values.
 * Supports:
 * - Comma separated lists: "1, 2, 3"
 * - Space separated lists: "1 2 3"
 * - Ranges of numbers: "1-5", "10..15"
 * - Ranges of letters: "a-e", "A-E"
 */
export function parseSet(str) {
  if (!str) return new Set();
  
  const items = [];
  // Split by comma or whitespace, but keep individual parts intact
  const parts = str.split(/[\s,]+/);
  
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    
    // 1. Try numerical range (e.g. "1-5" or "1..5")
    const numRangeMatch = part.match(/^(\d+)(?:-|\.\.)(\d+)$/);
    if (numRangeMatch) {
      const start = parseInt(numRangeMatch[1], 10);
      const end = parseInt(numRangeMatch[2], 10);
      
      if (start <= end && end - start <= 100) { // Limit range size to avoid DOS
        for (let i = start; i <= end; i++) {
          items.push(String(i));
        }
      } else {
        // Range too large or inverted, treat as string literal
        items.push(part);
      }
      continue;
    }
    
    // 2. Try alphabetical range (e.g. "a-e" or "A-Z")
    const alphaRangeMatch = part.match(/^([a-zA-Z])(?:-|\.\.)([a-zA-Z])$/);
    if (alphaRangeMatch) {
      const startCode = alphaRangeMatch[1].charCodeAt(0);
      const endCode = alphaRangeMatch[2].charCodeAt(0);
      
      // Ensure they are same case and range is small
      const isSameCase = (startCode >= 97 && endCode >= 97) || (startCode <= 90 && endCode <= 90);
      if (startCode <= endCode && endCode - startCode <= 52 && isSameCase) {
        for (let i = startCode; i <= endCode; i++) {
          items.push(String.fromCharCode(i));
        }
      } else {
        items.push(part);
      }
      continue;
    }
    
    // 3. Fallback to standard token
    items.push(part);
  }
  
  return new Set(items);
}

function sortElements(set) {
  return Array.from(set).sort((a, b) => {
    // Sort numbers numerically and strings alphabetically
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return String(a).localeCompare(String(b));
  });
}

// Elements come from user input and get injected via innerHTML
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Format set output as pretty mathematical set notation: {a, b, c}
 */
export function formatSet(set) {
  if (set.size === 0) return '∅ (Conjunto Vacío)';
  return `{ ${sortElements(set).map(escapeHtml).join(', ')} }`;
}

/**
 * Same notation but TeX-safe, for use inside MathJax \( ... \) delimiters
 * (braces must be escaped or TeX swallows them as grouping).
 */
export function texSet(set) {
  if (set.size === 0) return '\\emptyset';
  return `\\{ ${sortElements(set).map(escapeHtml).join(', ')} \\}`;
}
