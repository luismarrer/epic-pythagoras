import { gcd, getLcmGridSteps, type LcmGrid } from './math-utils';

export type { LcmGrid } from './math-utils';

/**
 * NOTE: step strings must NOT include their own "1." numbering — the
 * controller's step renderer prepends the number to each item.
 */

export interface Fraction {
  num: number;
  den: number;
}

export interface ImproperFractionResult {
  numerator: number;
  denominator: number;
  steps: string[];
}

export interface MixedNumberResult extends ImproperFractionResult {
  whole: number;
}

export interface SimplifyResult extends ImproperFractionResult {
  gcdValue: number;
}

export type EquationVariable = 'A' | 'B' | 'C' | 'D';

export interface MissingValueResult {
  variable: EquationVariable;
  value: number;
  fractionString: string;
  steps: string[];
}

export interface ConvertedFraction {
  originalNum: number;
  originalDen: number;
  convertedNum: number;
  convertedDen: number;
  scale: number;
}

export interface LcdResult {
  lcd: number;
  lcmData: LcmGrid | null;
  convertedFractions: ConvertedFraction[];
  steps: string[];
}

const fmtValue = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(3);

const normalizeInt = (value: number, fallback: number): number => {
  const n = Math.abs(Math.trunc(value));
  return Number.isFinite(n) && n !== 0 ? n : fallback;
};

/**
 * 1. Convert Mixed Number to Improper Fraction
 * Formula: W (N/D) = (W * D + N) / D
 */
export function mixedToImproper(whole: number, num: number, den: number): ImproperFractionResult {
  whole = normalizeInt(whole, 0);
  num = normalizeInt(num, 0);
  den = normalizeInt(den, 1);

  const resultNum = whole * den + num;
  const steps = [
    `Multiplica la parte entera por el denominador: \\(${whole} \\times ${den} = ${whole * den}\\)`,
    `Suma el numerador al resultado: \\(${whole * den} + ${num} = ${resultNum}\\)`,
    `Escribe el resultado sobre el denominador original: \\(\\frac{${resultNum}}{${den}}\\)`,
  ];

  return { numerator: resultNum, denominator: den, steps };
}

/**
 * 2. Convert Improper Fraction to Mixed Number
 * Formula: N / D = W with remainder R => W (R/D)
 */
export function improperToMixed(num: number, den: number): MixedNumberResult {
  num = normalizeInt(num, 0);
  den = normalizeInt(den, 1);

  const whole = Math.floor(num / den);
  const remainder = num % den;

  const steps = [
    `Divide el numerador entre el denominador: \\(${num} \\div ${den} = ${whole}\\) con residuo \\(${remainder}\\)`,
    `La parte entera es el cociente: \\(${whole}\\)`,
  ];
  if (remainder === 0) {
    steps.push(`El residuo es 0, así que la fracción equivale al número entero \\(${whole}\\).`);
  } else {
    steps.push(
      `El nuevo numerador es el residuo: \\(${remainder}\\)`,
      `Escribe el número mixto: \\(${whole}\\;\\frac{${remainder}}{${den}}\\)`
    );
  }

  return { whole, numerator: remainder, denominator: den, steps };
}

/**
 * 3. Simplify Fraction
 * Finds GCD and divides both.
 */
export function simplifyFraction(num: number, den: number): SimplifyResult {
  const sign = (num < 0) !== (den < 0) ? -1 : 1;
  num = normalizeInt(num, 0);
  den = normalizeInt(den, 1);

  const commonDivisor = gcd(num, den);
  const simplifiedNum = (sign * num) / commonDivisor;
  const simplifiedDen = den / commonDivisor;

  const steps =
    commonDivisor === 1
      ? [
          `Encuentra el Máximo Común Divisor (MCD) de \\(${num}\\) y \\(${den}\\): MCD = \\(1\\)`,
          'La fracción ya está en su mínima expresión: no se puede simplificar más.',
        ]
      : [
          `Encuentra el Máximo Común Divisor (MCD) de \\(${num}\\) y \\(${den}\\): MCD = \\(${commonDivisor}\\)`,
          `Divide el numerador por el MCD: \\(${num} \\div ${commonDivisor} = ${Math.abs(simplifiedNum)}\\)`,
          `Divide el denominador por el MCD: \\(${den} \\div ${commonDivisor} = ${simplifiedDen}\\)`,
          `Fracción simplificada: \\(\\frac{${simplifiedNum}}{${simplifiedDen}}\\)`,
        ];

  return {
    numerator: simplifiedNum,
    denominator: simplifiedDen,
    gcdValue: commonDivisor,
    steps,
  };
}

/**
 * 4. Solve for Missing Value in Equivalent Fraction: A/B = C/D
 * Exactly one value must be null (the unknown). Cross-multiplication:
 * A·D = B·C, so the unknown is always (product of its diagonal) / (its pair).
 * The caller must validate that the divisor is non-zero.
 */
export function solveMissingValue(
  a: number | null,
  b: number | null,
  c: number | null,
  d: number | null
): MissingValueResult {
  interface SolveConfig {
    variable: EquationVariable;
    unknown: boolean;
    top: [number | null, number | null];
    bottom: number | null;
    equation: (x: string) => string;
  }

  const configs: SolveConfig[] = [
    { variable: 'A', unknown: a === null, top: [b, c], bottom: d, equation: x => `\\frac{${x}}{${b}} = \\frac{${c}}{${d}}` },
    { variable: 'B', unknown: b === null, top: [a, d], bottom: c, equation: x => `\\frac{${a}}{${x}} = \\frac{${c}}{${d}}` },
    { variable: 'C', unknown: c === null, top: [a, d], bottom: b, equation: x => `\\frac{${a}}{${b}} = \\frac{${x}}{${d}}` },
    { variable: 'D', unknown: d === null, top: [b, c], bottom: a, equation: x => `\\frac{${a}}{${b}} = \\frac{${c}}{${x}}` },
  ];

  const config = configs.find(cfg => cfg.unknown);
  if (!config || config.top.some(v => v === null) || config.bottom === null) {
    throw new Error('solveMissingValue requiere exactamente un valor desconocido (null).');
  }

  const [t1, t2] = config.top as [number, number];
  const bottom = config.bottom;
  const product = t1 * t2;
  const value = product / bottom;

  const steps = [
    `Ecuación original: \\(${config.equation('x')}\\)`,
    `Multiplica de forma cruzada: \\(x \\times ${bottom} = ${t1} \\times ${t2}\\)`,
    `Resuelve la multiplicación: \\(x \\times ${bottom} = ${product}\\)`,
    `Divide ambos lados entre \\(${bottom}\\): \\(x = \\frac{${product}}{${bottom}}\\)`,
    `Resultado: \\(x = ${fmtValue(value)}\\)`,
  ];

  let fractionString = '';
  if (!Number.isInteger(value)) {
    const divisor = gcd(product, bottom);
    fractionString = `\\(\\frac{${product / divisor}}{${bottom / divisor}}\\)`;
    steps.push(`En forma de fracción simplificada: ${fractionString}`);
  }

  return { variable: config.variable, value, fractionString, steps };
}

/**
 * 5. Find Least Common Denominator (LCD) / Mínimo Común Denominador (MCDen)
 * The controller replaces steps[1] with the rendered prime-factor table.
 */
export function solveLcd(fractions: readonly Fraction[]): LcdResult {
  const denominators = fractions.map(f => f.den).filter(d => d > 0);
  if (denominators.length === 0) {
    return { lcd: 1, lcmData: null, steps: [], convertedFractions: [] };
  }

  const lcmData = getLcmGridSteps(denominators);
  const lcd = lcmData.lcmValue;

  const convertedFractions: ConvertedFraction[] = fractions.map(f => {
    const scale = lcd / f.den;
    return {
      originalNum: f.num,
      originalDen: f.den,
      convertedNum: f.num * scale,
      convertedDen: lcd,
      scale,
    };
  });

  const steps = [
    `Extrae los denominadores de las fracciones: \\(${denominators.join(', ')}\\)`,
    `Encuentra el Mínimo Común Múltiplo (MCM) de los denominadores usando la tabla de factores primos.`,
    `El MCM de \\(${denominators.join(', ')}\\) es <strong>${lcd}</strong>: ese es el mínimo común denominador.`,
  ];

  convertedFractions.forEach(cf => {
    steps.push(
      `Para \\(\\frac{${cf.originalNum}}{${cf.originalDen}}\\): multiplica numerador y denominador por \\(${lcd} \\div ${cf.originalDen} = ${cf.scale}\\): \\(\\frac{${cf.originalNum} \\times ${cf.scale}}{${cf.originalDen} \\times ${cf.scale}} = \\frac{${cf.convertedNum}}{${lcd}}\\)`
    );
  });

  return { lcd, lcmData, convertedFractions, steps };
}

/* ==========================================================================
   SVG renderers (the only DOM-touching code in this module)
   ========================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';

// Improper fractions can need many unit circles/bars; cap what we draw.
const MAX_UNITS = 8;

type SvgAttrs = Record<string, string | number>;

function svgNode<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: SvgAttrs = {}
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function svgText(attrs: SvgAttrs, content: string): SVGTextElement {
  const text = svgNode('text', attrs);
  text.textContent = content;
  return text;
}

/** How many slices of unit `index` are filled for numerator/denominator. */
const filledInUnit = (index: number, numerator: number, denominator: number): number =>
  Math.max(0, Math.min(denominator, numerator - index * denominator));

const unitCount = (numerator: number, denominator: number) => {
  const total = Math.max(1, Math.ceil(numerator / denominator) || 1);
  const drawn = Math.min(total, MAX_UNITS);
  return { drawn, hidden: total - drawn };
};

/**
 * Renders SVG pie charts representing a fraction (non-negative integers).
 * Improper fractions draw one circle per whole unit plus the remainder.
 */
export function drawFractionPie(
  container: HTMLElement,
  numerator: number,
  denominator: number,
  width = 160,
  height = 160
): void {
  container.replaceChildren();
  if (denominator <= 0) return;

  const { drawn, hidden } = unitCount(numerator, denominator);

  const svg = svgNode('svg', {
    width: '100%',
    height,
    viewBox: `0 0 ${drawn * width + (hidden > 0 ? 50 : 0)} ${height}`,
  });
  svg.style.maxHeight = '100%';

  const cy = height / 2;
  const r = 55;

  for (let unit = 0; unit < drawn; unit++) {
    const cx = width / 2 + unit * width;
    const filledSlices = filledInUnit(unit, numerator, denominator);
    const angleStep = (2 * Math.PI) / denominator;

    if (denominator === 1) {
      svg.appendChild(
        svgNode('circle', {
          cx, cy, r,
          class: filledSlices > 0 ? 'fraction-slice filled' : 'fraction-slice',
        })
      );
    } else {
      for (let i = 0; i < denominator; i++) {
        const startAngle = i * angleStep - Math.PI / 2;
        const endAngle = (i + 1) * angleStep - Math.PI / 2;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);

        svg.appendChild(
          svgNode('path', {
            d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`,
            class: i < filledSlices ? 'fraction-slice filled' : 'fraction-slice',
          })
        );
      }
    }

    svg.appendChild(svgNode('circle', { cx, cy, r, class: 'fraction-circle-border' }));

    svg.appendChild(
      svgText(
        { x: cx, y: cy + r + 18, 'text-anchor': 'middle', class: 'fraction-label-text' },
        filledSlices === denominator
          ? `${denominator}/${denominator} (1)`
          : `${filledSlices}/${denominator}`
      )
    );
  }

  if (hidden > 0) {
    svg.appendChild(
      svgText(
        { x: drawn * width + 25, y: cy, 'text-anchor': 'middle', class: 'fraction-label-text' },
        `+${hidden}`
      )
    );
  }

  container.appendChild(svg);
}

/**
 * Renders SVG horizontal bars representing a fraction (non-negative integers).
 */
export function drawFractionBar(
  container: HTMLElement,
  numerator: number,
  denominator: number,
  width = 360,
  height = 75
): void {
  container.replaceChildren();
  if (denominator <= 0) return;

  const { drawn, hidden } = unitCount(numerator, denominator);

  const svgHeight = drawn * height + (hidden > 0 ? 22 : 0);
  const svg = svgNode('svg', {
    width: '100%',
    height: svgHeight,
    viewBox: `0 0 ${width} ${svgHeight}`,
  });
  svg.style.maxHeight = '100%';

  const paddingY = 10;
  const barHeight = 40;
  const innerWidth = width - 40; // 20px padding left/right
  const startX = 20;

  for (let unit = 0; unit < drawn; unit++) {
    const startY = paddingY + unit * height;
    const filledCount = filledInUnit(unit, numerator, denominator);
    const segmentWidth = innerWidth / denominator;

    svg.appendChild(
      svgNode('rect', {
        x: startX, y: startY, width: innerWidth, height: barHeight,
        rx: 4, class: 'fraction-bar-bg',
      })
    );

    for (let i = 0; i < denominator; i++) {
      const isFilled = i < filledCount;
      const segX = startX + i * segmentWidth;
      const segment = svgNode('rect', {
        x: segX, y: startY, width: segmentWidth, height: barHeight,
        class: isFilled ? 'fraction-bar-segment filled' : 'fraction-bar-segment',
      });

      // Round only the outer corners: first/last segment get rx, and a cover
      // rect squares off the inner edge so middle joints stay straight.
      if (denominator === 1) {
        segment.setAttribute('rx', '4');
        svg.appendChild(segment);
      } else if (i === 0 || i === denominator - 1) {
        segment.setAttribute('rx', '4');
        svg.appendChild(segment);
        svg.appendChild(
          svgNode('rect', {
            x: i === 0 ? segX + segmentWidth - 4 : segX,
            y: startY, width: 4, height: barHeight,
            class: isFilled ? 'fraction-bar-cover filled' : 'fraction-bar-cover',
          })
        );
      } else {
        svg.appendChild(segment);
      }
    }

    for (let i = 1; i < denominator; i++) {
      const lineX = startX + i * segmentWidth;
      svg.appendChild(
        svgNode('line', {
          x1: lineX, y1: startY, x2: lineX, y2: startY + barHeight,
          class: 'fraction-bar-divider',
        })
      );
    }

    svg.appendChild(
      svgText(
        { x: width / 2, y: startY + barHeight + 15, 'text-anchor': 'middle', class: 'fraction-label-text' },
        filledCount === denominator
          ? `Barra entera (${denominator}/${denominator})`
          : `Barra fraccionaria (${filledCount}/${denominator})`
      )
    );
  }

  if (hidden > 0) {
    svg.appendChild(
      svgText(
        { x: width / 2, y: drawn * height + 12, 'text-anchor': 'middle', class: 'fraction-label-text' },
        `… y ${hidden} ${hidden === 1 ? 'barra entera más' : 'barras enteras más'}`
      )
    );
  }

  container.appendChild(svg);
}
