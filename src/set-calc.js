import { parseSet, formatSet, texSet, escapeHtml } from './set-parser.js';

// Re-export parser helpers for accessibility
export { parseSet, formatSet, texSet, escapeHtml };

/**
 * Set operations
 */
export function union(setA, setB) {
  return new Set([...setA, ...setB]);
}

export function intersection(setA, setB) {
  return new Set([...setA].filter(x => setB.has(x)));
}

export function difference(setA, setB) {
  return new Set([...setA].filter(x => !setB.has(x)));
}

export function symmetricDifference(setA, setB) {
  const diffA = difference(setA, setB);
  const diffB = difference(setB, setA);
  return union(diffA, diffB);
}

export function cartesianProduct(setA, setB) {
  const result = [];
  for (const a of setA) {
    for (const b of setB) {
      result.push([a, b]);
    }
  }
  return result;
}

export function isSubset(setA, setB) {
  if (setA.size > setB.size) return false;
  for (const x of setA) {
    if (!setB.has(x)) return false;
  }
  return true;
}

export function areDisjoint(setA, setB) {
  for (const x of setA) {
    if (setB.has(x)) return false;
  }
  return true;
}

/**
 * Generates coordinate placements for elements inside regions of a Venn diagram.
 * Regions:
 * - 'A': A \ B (Left crescent)
 * - 'B': B \ A (Right crescent)
 * - 'AB': A \cap B (Overlap lens)
 * - 'U': U \ (A \cup B) (Universal rectangle outside circles)
 */
export function distributeElementsInVenn(elements, region, width = 400, height = 250) {
  const points = [];
  const count = elements.length;
  if (count === 0) return points;

  // Region centers & bounds for distribution
  let rx, ry, r;
  
  if (region === 'A') {
    // Only A: Center (125, 125)
    rx = 125;
    ry = 125;
    r = 35;
  } else if (region === 'B') {
    // Only B: Center (275, 125)
    rx = 275;
    ry = 125;
    r = 35;
  } else if (region === 'AB') {
    // Intersection: Center (200, 125) - vertical oval shape
    rx = 200;
    ry = 125;
    r = 20; // smaller radius to keep it inside the lens
  } else {
    // Outside / Complement: Place in corners
    const corners = [
      { x: 50, y: 50 },
      { x: 350, y: 50 },
      { x: 50, y: 200 },
      { x: 350, y: 200 },
      { x: 200, y: 40 },
      { x: 200, y: 210 }
    ];
    
    for (let i = 0; i < count; i++) {
      const idx = i % corners.length;
      // Add a slight jitter
      const jitterX = (Math.random() - 0.5) * 20;
      const jitterY = (Math.random() - 0.5) * 10;
      points.push({
        element: elements[i],
        x: corners[idx].x + jitterX,
        y: corners[idx].y + jitterY
      });
    }
    return points;
  }

  // Use golden spiral / phyllotaxis layout for neat distribution inside circular regions
  for (let i = 0; i < count; i++) {
    let x, y;
    if (count === 1) {
      x = rx;
      y = ry;
    } else {
      // Golden angle in radians
      const theta = i * 2.39996;
      // Radius increases with index to distribute outwards
      const dist = r * Math.sqrt((i + 0.5) / count);
      
      // For intersection, squish horizontally to fit vertical lens shape
      if (region === 'AB') {
        x = rx + dist * 0.6 * Math.cos(theta);
        y = ry + dist * 1.5 * Math.sin(theta);
      } else {
        x = rx + dist * Math.cos(theta);
        y = ry + dist * Math.sin(theta);
      }
    }
    points.push({
      element: elements[i],
      x,
      y
    });
  }

  return points;
}
