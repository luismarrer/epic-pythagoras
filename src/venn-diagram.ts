/**
 * SVG Venn diagram renderer for 2 or 3 sets.
 *
 * Instead of hardcoding arc paths per region, each region is built from the
 * circle of its first member set plus SVG clip-paths (intersection with other
 * members) and luminance masks (subtraction of non-members). That makes the
 * same code work for the 2-set and the 3-set diagram.
 *
 * LAYOUTS is the single source of truth for the geometry: circle positions and
 * the element "spots" (where region elements are placed) are tuned to each
 * other — change them together.
 */
import { unionAll, type StringSet } from './set-calc';
import { sortElements } from './set-parser';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GOLDEN_ANGLE = 2.39996; // radians; phyllotaxis layout inside region spots
const SET_SUFFIX = ['a', 'b', 'c'] as const; // CSS class suffix per set index

interface Point {
  x: number;
  y: number;
}

/** Circular area where a region's elements are laid out; sx/sy squish the spread. */
interface Spot extends Point {
  r: number;
  sx?: number;
  sy?: number;
}

interface Circle {
  cx: number;
  cy: number;
  r: number;
}

interface SetLabel extends Point {
  anchor: 'start' | 'middle' | 'end';
  text: (name: string) => string;
}

interface RegionDef {
  spot: Spot;
  /** Max elements rendered before collapsing into a "+N más" marker */
  cap: number;
}

interface VennLayout {
  viewBox: string;
  rect: { x: number; y: number; width: number; height: number };
  circles: Circle[];
  setLabels: SetLabel[];
  /** Keyed by membership signature: one bit per set ('10' = only in A) */
  regions: Record<string, RegionDef>;
  outsideSpots: Point[];
  universeLabel: Point;
}

type SvgAttrs = Record<string, string | number | undefined>;

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: SvgAttrs = {}
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) node.setAttribute(key, String(value));
  }
  return node;
}

const LAYOUTS: Record<number, VennLayout> = {
  2: {
    viewBox: '0 0 400 250',
    rect: { x: 10, y: 10, width: 380, height: 230 },
    circles: [
      { cx: 160, cy: 120, r: 75 },
      { cx: 240, cy: 120, r: 75 },
    ],
    setLabels: [
      { x: 95, y: 38, anchor: 'start', text: name => `Conjunto ${name}` },
      { x: 305, y: 38, anchor: 'end', text: name => `Conjunto ${name}` },
    ],
    regions: {
      '10': { spot: { x: 125, y: 125, r: 34 }, cap: 6 },
      '01': { spot: { x: 275, y: 125, r: 34 }, cap: 6 },
      '11': { spot: { x: 200, y: 122, r: 20, sx: 0.6, sy: 1.5 }, cap: 5 },
    },
    outsideSpots: [
      { x: 50, y: 50 }, { x: 350, y: 50 }, { x: 50, y: 205 },
      { x: 350, y: 205 }, { x: 200, y: 38 }, { x: 200, y: 218 },
    ],
    universeLabel: { x: 22, y: 30 },
  },
  3: {
    viewBox: '0 0 400 260',
    rect: { x: 10, y: 10, width: 380, height: 240 },
    circles: [
      { cx: 160, cy: 112, r: 62 },
      { cx: 240, cy: 112, r: 62 },
      { cx: 200, cy: 179, r: 62 },
    ],
    setLabels: [
      { x: 103, y: 56, anchor: 'middle', text: name => name },
      { x: 297, y: 56, anchor: 'middle', text: name => name },
      { x: 273, y: 218, anchor: 'middle', text: name => name },
    ],
    regions: {
      '100': { spot: { x: 126, y: 101, r: 22 }, cap: 5 },
      '010': { spot: { x: 274, y: 101, r: 22 }, cap: 5 },
      '001': { spot: { x: 200, y: 215, r: 20 }, cap: 5 },
      '110': { spot: { x: 200, y: 88, r: 12 }, cap: 3 },
      '101': { spot: { x: 171, y: 146, r: 10 }, cap: 2 },
      '011': { spot: { x: 229, y: 146, r: 10 }, cap: 2 },
      '111': { spot: { x: 200, y: 134, r: 9 }, cap: 2 },
    },
    outsideSpots: [
      { x: 45, y: 42 }, { x: 355, y: 42 }, { x: 45, y: 230 },
      { x: 355, y: 230 }, { x: 200, y: 30 },
    ],
    universeLabel: { x: 22, y: 28 },
  },
};

/** All non-empty membership signatures for n sets, e.g. n=2 → 10, 01, 11 */
function regionSignatures(count: number): string[] {
  const signatures: string[] = [];
  for (let mask = 1; mask < (1 << count); mask++) {
    signatures.push(
      Array.from({ length: count }, (_, i) => ((mask >> i) & 1 ? '1' : '0')).join('')
    );
  }
  return signatures;
}

const memberIndices = (signature: string): number[] =>
  [...signature].flatMap((bit, i) => (bit === '1' ? [i] : []));
const nonMemberIndices = (signature: string): number[] =>
  [...signature].flatMap((bit, i) => (bit === '0' ? [i] : []));

function maskCircle(circle: Circle, fill?: string): SVGCircleElement {
  return svgEl('circle', { cx: circle.cx, cy: circle.cy, r: circle.r, fill });
}

/**
 * Builds <defs> with one clipPath per circle and one mask per region.
 * Region shape = base circle ∩ clip (second member) ∩ mask, where the mask
 * keeps the third member (triple region) and removes every non-member.
 */
function buildDefs(layout: VennLayout, signatures: string[]): SVGDefsElement {
  const defs = svgEl('defs');
  const [, , vbWidth, vbHeight] = layout.viewBox.split(' ').map(Number);

  layout.circles.forEach((circle, i) => {
    const clip = svgEl('clipPath', { id: `venn-clip-${i}` });
    clip.appendChild(maskCircle(circle));
    defs.appendChild(clip);
  });

  const newMask = (id: string): SVGMaskElement =>
    svgEl('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: vbWidth, height: vbHeight });
  const fullRect = (fill: string): SVGRectElement =>
    svgEl('rect', { x: 0, y: 0, width: vbWidth, height: vbHeight, fill });

  for (const signature of signatures) {
    const keep = memberIndices(signature)[2]; // third member: only the triple region
    const subtract = nonMemberIndices(signature);
    if (keep === undefined && subtract.length === 0) continue; // pure clip, no mask

    const mask = newMask(`venn-mask-${signature}`);
    mask.appendChild(fullRect(keep === undefined ? '#fff' : '#000'));
    if (keep !== undefined) mask.appendChild(maskCircle(layout.circles[keep]!, '#fff'));
    subtract.forEach(i => mask.appendChild(maskCircle(layout.circles[i]!, '#000')));
    defs.appendChild(mask);
  }

  // Outside region: everything not covered by a circle (highlighted by complements)
  const outsideMask = newMask('venn-mask-outside');
  outsideMask.appendChild(fullRect('#fff'));
  layout.circles.forEach(circle => outsideMask.appendChild(maskCircle(circle, '#000')));
  defs.appendChild(outsideMask);

  return defs;
}

function regionNode(layout: VennLayout, signature: string, active: boolean): SVGCircleElement {
  const members = memberIndices(signature);
  const base = layout.circles[members[0]!]!;
  const needsMask = members.length === 3 || nonMemberIndices(signature).length > 0;

  const node = svgEl('circle', {
    cx: base.cx, cy: base.cy, r: base.r,
    class: `venn-region${active ? ' active-op' : ''}`,
  });
  if (members.length > 1) node.setAttribute('clip-path', `url(#venn-clip-${members[1]})`);
  if (needsMask) node.setAttribute('mask', `url(#venn-mask-${signature})`);
  return node;
}

/** Deterministic golden-angle spiral inside a spot. */
function spiralPoints(count: number, { x, y, r, sx = 1, sy = 1 }: Spot): Point[] {
  if (count === 1) return [{ x, y }];
  return Array.from({ length: count }, (_, i) => {
    const theta = i * GOLDEN_ANGLE;
    const dist = r * Math.sqrt((i + 0.5) / count);
    return { x: x + dist * sx * Math.cos(theta), y: y + dist * sy * Math.sin(theta) };
  });
}

function elementText({ x, y }: Point, content: string): SVGTextElement {
  const text = svgEl('text', { x, y, class: 'venn-element-text' });
  text.textContent = content;
  return text;
}

function overflowMarker(point: Point, hiddenCount: number): SVGTextElement {
  const marker = elementText(point, `+${hiddenCount} más`);
  marker.classList.add('venn-overflow');
  return marker;
}

function placeInSpot(svg: SVGSVGElement, region: RegionDef, elements: string[]): void {
  const overflow = elements.length > region.cap;
  const visible = overflow ? elements.slice(0, region.cap - 1) : elements;
  const points = spiralPoints(visible.length + (overflow ? 1 : 0), region.spot);
  visible.forEach((element, i) => svg.appendChild(elementText(points[i]!, element)));
  if (overflow) {
    svg.appendChild(overflowMarker(points[points.length - 1]!, elements.length - visible.length));
  }
}

function placeOutside(svg: SVGSVGElement, spots: Point[], elements: string[]): void {
  const overflow = elements.length > spots.length;
  const visible = overflow ? elements.slice(0, spots.length - 1) : elements;
  visible.forEach((element, i) => svg.appendChild(elementText(spots[i]!, element)));
  if (overflow) {
    svg.appendChild(overflowMarker(spots[spots.length - 1]!, elements.length - visible.length));
  }
}

function placeElements(
  svg: SVGSVGElement,
  layout: VennLayout,
  sets: readonly StringSet[],
  universe: StringSet
): void {
  const groups = new Map<string, string[]>(); // signature (or 'outside') → sorted elements
  for (const element of sortElements(unionAll([...sets, universe]))) {
    const signature = sets.map(s => (s.has(element) ? '1' : '0')).join('');
    const key = signature.includes('1') ? signature : 'outside';
    const group = groups.get(key) ?? [];
    if (group.length === 0) groups.set(key, group);
    group.push(element);
  }

  for (const [key, elements] of groups) {
    if (key === 'outside') {
      placeOutside(svg, layout.outsideSpots, elements);
    } else {
      const region = layout.regions[key];
      if (region) placeInSpot(svg, region, elements);
    }
  }
}

export interface VennRenderOptions {
  sets: StringSet[];
  names: string[];
  universe?: StringSet;
  /**
   * Membership predicate — receives one boolean per set and answers whether an
   * element with those memberships belongs to the result; drives which regions
   * get highlighted (all-false = the outside region).
   */
  isInResult: (flags: boolean[]) => boolean;
  description?: string;
}

export function renderVennDiagram(
  svg: SVGSVGElement,
  { sets, names, universe = new Set<string>(), isInResult, description }: VennRenderOptions
): void {
  const layout = LAYOUTS[sets.length];
  if (!layout) throw new Error(`Diagrama de Venn no soportado para ${sets.length} conjuntos`);

  svg.setAttribute('viewBox', layout.viewBox);
  if (description) svg.setAttribute('aria-label', description);
  svg.replaceChildren();

  const signatures = regionSignatures(sets.length);
  svg.appendChild(buildDefs(layout, signatures));
  svg.appendChild(svgEl('rect', { ...layout.rect, rx: 12, class: 'venn-rect' }));

  const activeFor = (signature: string): boolean =>
    isInResult([...signature].map(bit => bit === '1'));

  svg.appendChild(
    svgEl('rect', {
      ...layout.rect, rx: 12,
      class: `venn-region${activeFor('0'.repeat(sets.length)) ? ' active-op' : ''}`,
      mask: 'url(#venn-mask-outside)',
    })
  );

  signatures.forEach(signature =>
    svg.appendChild(regionNode(layout, signature, activeFor(signature)))
  );

  layout.circles.forEach((circle, i) => {
    svg.appendChild(
      svgEl('circle', {
        cx: circle.cx, cy: circle.cy, r: circle.r,
        class: `venn-circle venn-circle-${SET_SUFFIX[i]}`,
      })
    );
  });

  layout.setLabels.forEach((label, i) => {
    const text = svgEl('text', {
      x: label.x, y: label.y, 'text-anchor': label.anchor,
      class: `venn-label venn-label-${SET_SUFFIX[i]}`,
    });
    text.textContent = label.text(names[i] ?? '');
    svg.appendChild(text);
  });

  const uLabel = svgEl('text', {
    x: layout.universeLabel.x, y: layout.universeLabel.y,
    class: 'venn-universe-label',
  });
  uLabel.textContent = 'Universo U';
  svg.appendChild(uLabel);

  placeElements(svg, layout, sets, universe);
}

/**
 * The cartesian product has no region-based Venn representation: draw the
 * input sets as separate dashed circles joined by "×".
 */
export function renderCartesianVenn(
  svg: SVGSVGElement,
  sets: readonly StringSet[],
  names: readonly string[]
): void {
  const three = sets.length === 3;
  const centers = three ? [80, 200, 320] : [120, 280];
  const radius = three ? 55 : 65;
  const cy = 130;

  svg.setAttribute('viewBox', '0 0 400 250');
  svg.setAttribute('aria-label', `Producto cartesiano de ${names.join(', ')}`);
  svg.replaceChildren();

  svg.appendChild(svgEl('rect', { x: 10, y: 10, width: 380, height: 230, rx: 12, class: 'venn-rect' }));

  centers.forEach((cx, i) => {
    svg.appendChild(
      svgEl('circle', {
        cx, cy, r: radius,
        class: `venn-circle venn-circle-${SET_SUFFIX[i]} venn-circle-dashed`,
      })
    );

    const label = svgEl('text', {
      x: cx, y: 45, 'text-anchor': 'middle',
      class: `venn-label venn-label-${SET_SUFFIX[i]}`,
    });
    label.textContent = three ? (names[i] ?? '') : `Conjunto ${names[i]}`;
    svg.appendChild(label);

    const elements = sortElements(sets[i] ?? new Set<string>());
    elements.slice(0, 4).forEach((element, row) => {
      svg.appendChild(elementText({ x: cx, y: 100 + row * 20 }, element));
    });
    if (elements.length > 4) {
      svg.appendChild(elementText({ x: cx, y: 100 + 4 * 20 }, '…'));
    }
  });

  for (let i = 1; i < centers.length; i++) {
    const cross = svgEl('text', {
      x: (centers[i - 1]! + centers[i]!) / 2, y: cy + 8,
      'text-anchor': 'middle', class: 'venn-cross',
    });
    cross.textContent = '×';
    svg.appendChild(cross);
  }
}
