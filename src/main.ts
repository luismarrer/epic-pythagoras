import {
  parseSet, formatSet, texSet, escapeHtml,
  intersection, difference,
  unionAll, intersectionAll, symmetricDifferenceAll,
  cartesianProduct, isSubset, areDisjoint,
} from './set-calc';
import { renderVennDiagram, renderCartesianVenn } from './venn-diagram';
import {
  mixedToImproper, improperToMixed, simplifyFraction, solveMissingValue, solveLcd,
  drawFractionPie, drawFractionBar,
  type Fraction, type LcmGrid,
} from './fraction-calc';

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements: Element[]) => Promise<void>;
    };
  }
}

/** Typed getElementById that fails fast when the markup contract is broken. */
function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento requerido no encontrado: #${id}`);
  return element as T;
}

const input = (id: string): HTMLInputElement => $<HTMLInputElement>(id);

// Re-render MathJax formulas after injecting dynamic content
function typesetMath(...elements: Element[]): void {
  window.MathJax?.typesetPromise?.(elements).catch(() => {});
}

/** Shared step-list renderer; steps are HTML strings with \(...\) TeX inside. */
function renderStepList(stepsList: HTMLElement, resultDisplay: HTMLElement, steps: string[]): void {
  stepsList.replaceChildren(
    ...steps.map((step, index) => {
      const item = document.createElement('div');
      item.className = 'step-item';
      item.innerHTML = `<span class="step-number">${index + 1}.</span> <div>${step}</div>`;
      return item;
    })
  );
  typesetMath(resultDisplay, stepsList);
}

const fmtNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(parseFloat(value.toFixed(3)));

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTablists();
  initSetCalculator();
  initFractionCalculator();
});

/* ==========================================================================
   1. THEME INITIALIZATION & TOGGLE
   ========================================================================== */
function initTheme(): void {
  const themeToggle = $('theme-toggle');
  const storedTheme = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  document.body.classList.toggle('light-mode', storedTheme ? storedTheme === 'light' : prefersLight);

  themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });
}

/* ==========================================================================
   2. TAB NAVIGATION (main tabs + fraction subtabs share the same behavior)
   ========================================================================== */
function setupTablist(tabs: HTMLElement[]): void {
  const activate = (activeTab: HTMLElement): void => {
    tabs.forEach(tab => {
      const selected = tab === activeTab;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('tabindex', selected ? '0' : '-1');
      const panelId = tab.getAttribute('aria-controls');
      if (panelId) document.getElementById(panelId)?.classList.toggle('active', selected);
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!delta) return;
      event.preventDefault();
      const next = tabs[(index + delta + tabs.length) % tabs.length]!;
      next.focus();
      next.click();
    });
  });
}

function initTablists(): void {
  setupTablist([...document.querySelectorAll<HTMLElement>('.tab-navigation .tab-btn')]);
  setupTablist([...document.querySelectorAll<HTMLElement>('.fraction-subtabs .subtab-btn')]);
}

/* ==========================================================================
   3. SET CALCULATOR CONTROLLER
   ========================================================================== */

type SetName = 'A' | 'B' | 'C';

interface StepsContext {
  sets: Set<string>[];
  names: SetName[];
  result: Set<string>;
  universe: Set<string>;
  universeWasGenerated: boolean;
}

interface OperationBase {
  /** Sets required for the operation to be available (3 hides it in 2-set mode) */
  minSets: number;
  title: (names: SetName[]) => string;
  buttonLabel: (names: SetName[]) => string;
  tex: (names: SetName[]) => string;
}

interface StandardOperation extends OperationBase {
  kind: 'standard';
  usesUniverse?: boolean;
  apply: (sets: Set<string>[], universe: Set<string>) => Set<string>;
  /** Membership predicate that drives Venn region highlighting */
  inResult: (flags: boolean[]) => boolean;
  steps: (context: StepsContext) => string[];
}

interface ProductOperation extends OperationBase {
  kind: 'product';
}

type SetOperation = StandardOperation | ProductOperation;

const texJoin = (names: readonly string[], symbol: string): string =>
  names.join(` ${symbol} `);

/**
 * Each operation is fully described here: how to compute it, how to label the
 * UI, how to explain it, and — for the Venn diagram — which membership
 * combinations belong to the result.
 */
function buildOperations(): Record<string, SetOperation> {
  const complementOf = (index: number): StandardOperation => ({
    kind: 'standard',
    minSets: index + 1,
    usesUniverse: true,
    title: names => `Complemento de ${names[index]}`,
    buttonLabel: names => `Complemento (${names[index]}')`,
    tex: names => `${names[index]}'`,
    apply: (sets, universe) => difference(universe, sets[index]!),
    inResult: flags => !flags[index],
    steps: ({ sets, names, result, universe, universeWasGenerated }) => {
      const name = names[index]!;
      const steps = [
        `El complemento \\(${name}'\\) contiene todos los elementos del conjunto universal \\(U\\) que NO están en \\(${name}\\).`,
        `Conjunto universal U: \\(${texSet(universe)}\\)`,
        `Se descartan los elementos de ${name}: \\(${texSet(sets[index]!)}\\)`,
        `Elementos del complemento: \\(${texSet(result)}\\)`,
      ];
      if (universeWasGenerated) {
        steps.push(
          `<em>Nota: al no indicar un conjunto universal U, se generó uno de ejemplo con la unión de los conjuntos más los elementos x0, y0.</em>`
        );
      }
      return steps;
    },
  });

  return {
    union: {
      kind: 'standard',
      minSets: 2,
      title: () => 'Unión',
      buttonLabel: names => `Unión (${names.join(' ∪ ')})`,
      tex: names => texJoin(names, '\\cup'),
      apply: sets => unionAll(sets),
      inResult: flags => flags.some(Boolean),
      steps: ({ sets, names, result }) => [
        `La unión \\(${texJoin(names, '\\cup')}\\) reúne los elementos que aparecen en al menos uno de los conjuntos, sin repetir.`,
        ...sets.map((set, i) => `Conjunto ${names[i]}: \\(${texSet(set)}\\) (cardinalidad: \\(${set.size}\\))`),
        `Elementos reunidos sin duplicados: \\(${texSet(result)}\\)`,
      ],
    },

    intersection: {
      kind: 'standard',
      minSets: 2,
      title: () => 'Intersección',
      buttonLabel: names => `Intersección (${names.join(' ∩ ')})`,
      tex: names => texJoin(names, '\\cap'),
      apply: sets => intersectionAll(sets),
      inResult: flags => flags.every(Boolean),
      steps: ({ sets, names, result }) => [
        `La intersección \\(${texJoin(names, '\\cap')}\\) contiene solo los elementos que pertenecen a todos los conjuntos a la vez.`,
        ...sets.map((set, i) => `Conjunto ${names[i]}: \\(${texSet(set)}\\)`),
        `Elementos comunes encontrados: \\(${texSet(result)}\\)`,
      ],
    },

    'diff-ab': {
      kind: 'standard',
      minSets: 2,
      title: () => 'Diferencia A − B',
      buttonLabel: () => 'Diferencia (A − B)',
      tex: () => 'A - B',
      apply: ([a, b]) => difference(a!, b!),
      inResult: flags => Boolean(flags[0]) && !flags[1],
      steps: ({ sets }) => {
        const [a, b] = sets as [Set<string>, Set<string>];
        const steps = [
          `La diferencia \\(A - B\\) contiene los elementos que pertenecen a \\(A\\) pero NO a \\(B\\).`,
          `Conjunto A: \\(${texSet(a)}\\)`,
          `Se quitan los elementos que también están en B: \\(${texSet(intersection(a, b))}\\)`,
          `Elementos restantes de A: \\(${texSet(difference(a, b))}\\)`,
        ];
        if (sets.length === 3) steps.push('El conjunto C no interviene en esta operación: solo se comparan A y B.');
        return steps;
      },
    },

    'diff-ba': {
      kind: 'standard',
      minSets: 2,
      title: () => 'Diferencia B − A',
      buttonLabel: () => 'Diferencia (B − A)',
      tex: () => 'B - A',
      apply: ([a, b]) => difference(b!, a!),
      inResult: flags => Boolean(flags[1]) && !flags[0],
      steps: ({ sets }) => {
        const [a, b] = sets as [Set<string>, Set<string>];
        const steps = [
          `La diferencia \\(B - A\\) contiene los elementos que pertenecen a \\(B\\) pero NO a \\(A\\).`,
          `Conjunto B: \\(${texSet(b)}\\)`,
          `Se quitan los elementos que también están en A: \\(${texSet(intersection(a, b))}\\)`,
          `Elementos restantes de B: \\(${texSet(difference(b, a))}\\)`,
        ];
        if (sets.length === 3) steps.push('El conjunto C no interviene en esta operación: solo se comparan A y B.');
        return steps;
      },
    },

    'sym-diff': {
      kind: 'standard',
      minSets: 2,
      title: () => 'Diferencia Simétrica',
      buttonLabel: names => `Dif. Simétrica (${names.join(' Δ ')})`,
      tex: names => texJoin(names, '\\Delta'),
      apply: sets => symmetricDifferenceAll(sets),
      inResult: flags => flags.filter(Boolean).length % 2 === 1,
      steps: ({ sets, names, result }) => {
        if (sets.length === 2) {
          const [a, b] = sets as [Set<string>, Set<string>];
          return [
            `La diferencia simétrica \\(A \\Delta B\\) contiene los elementos que están en A o en B, pero no en ambos.`,
            `Equivale a la unión de las diferencias: \\((A - B) \\cup (B - A)\\)`,
            `Solo en A (A − B): \\(${texSet(difference(a, b))}\\)`,
            `Solo en B (B − A): \\(${texSet(difference(b, a))}\\)`,
            `Resultado: \\(${texSet(result)}\\)`,
          ];
        }
        const exactlyOne = unionAll(
          sets.map((set, i) => difference(set, unionAll(sets.filter((_, j) => j !== i))))
        );
        return [
          `La diferencia simétrica \\(${texJoin(names, '\\Delta')}\\) se calcula encadenando: \\((A \\Delta B) \\Delta C\\).`,
          `Un elemento queda en el resultado si aparece en un número impar de conjuntos: en exactamente uno, o en los tres.`,
          `Elementos en exactamente un conjunto: \\(${texSet(exactlyOne)}\\)`,
          `Elementos en los tres conjuntos: \\(${texSet(intersectionAll(sets))}\\)`,
          `Resultado: \\(${texSet(result)}\\)`,
        ];
      },
    },

    'complement-a': complementOf(0),
    'complement-b': complementOf(1),
    'complement-c': complementOf(2),

    product: {
      kind: 'product',
      minSets: 2,
      title: () => 'Producto Cartesiano',
      buttonLabel: names => `Prod. Cartesiano (${names.join(' × ')})`,
      tex: names => texJoin(names, '\\times'),
    },
  };
}

function describeRelations(sets: Set<string>[], names: SetName[]): string[] {
  const notes: string[] = [];
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const a = sets[i]!;
      const b = sets[j]!;
      if (a.size === 0 || b.size === 0) continue; // vacuous relations are noise
      const ni = names[i]!;
      const nj = names[j]!;
      if (isSubset(a, b) && isSubset(b, a)) {
        notes.push(`${ni} y ${nj} son iguales (\\(${ni} = ${nj}\\))`);
      } else if (isSubset(a, b)) {
        notes.push(`${ni} es subconjunto de ${nj} (\\(${ni} \\subseteq ${nj}\\))`);
      } else if (isSubset(b, a)) {
        notes.push(`${nj} es subconjunto de ${ni} (\\(${nj} \\subseteq ${ni}\\))`);
      }
      if (areDisjoint(a, b)) {
        notes.push(`${ni} y ${nj} son disjuntos (\\(${ni} \\cap ${nj} = \\emptyset\\))`);
      }
    }
  }
  return notes;
}

function initSetCalculator(): void {
  const form = $<HTMLFormElement>('sets-form');
  const setInputs: Record<SetName, HTMLInputElement> = {
    A: input('set-input-a'),
    B: input('set-input-b'),
    C: input('set-input-c'),
  };
  const universeInput = input('set-input-u');
  const resultDisplay = $('set-result-display');
  const stepsList = $('set-steps-list');
  const vennSvg = document.getElementById('venn-svg') as SVGSVGElement | null;
  if (!vennSvg) throw new Error('Elemento requerido no encontrado: #venn-svg');
  const opButtons = [...document.querySelectorAll<HTMLButtonElement>('#sets-panel .btn-op')];

  const OPERATIONS = buildOperations();
  let selectedOp = 'union';

  const getOperation = (id: string | undefined): SetOperation => {
    const op = id ? OPERATIONS[id] : undefined;
    if (!op) throw new Error(`Operación desconocida: ${id}`);
    return op;
  };

  const activeNames = (): SetName[] => (setInputs.C.value.trim() ? ['A', 'B', 'C'] : ['A', 'B']);
  const anySetFilled = (): boolean =>
    Object.values(setInputs).some(field => field.value.trim() !== '');
  const renderSteps = (steps: string[]): void => renderStepList(stepsList, resultDisplay, steps);

  function selectOperation(opId: string): void {
    selectedOp = opId;
    opButtons.forEach(btn => btn.classList.toggle('active', btn.dataset['op'] === opId));
  }

  /** Relabels operation buttons for 2- vs 3-set mode; hides C' when unavailable. */
  function refreshOpButtons(): void {
    const names = activeNames();
    opButtons.forEach(btn => {
      const op = getOperation(btn.dataset['op']);
      btn.textContent = op.buttonLabel(names);
      btn.hidden = op.minSets > names.length;
    });
    if (getOperation(selectedOp).minSets > names.length) selectOperation('union');
  }

  opButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const opId = btn.dataset['op'];
      if (!opId) return;
      selectOperation(opId);
      if (anySetFilled()) calculateSets();
    });
  });

  setInputs.C.addEventListener('input', refreshOpButtons);
  refreshOpButtons();

  form.addEventListener('submit', event => {
    event.preventDefault();
    calculateSets();
  });

  function calculateSets(): void {
    const names = activeNames();
    const sets = names.map(name => parseSet(setInputs[name].value.trim()));
    const op = getOperation(selectedOp);

    const rawUniverse = universeInput.value.trim();
    let universe = parseSet(rawUniverse);
    let universeWasGenerated = false;
    if (op.kind === 'standard' && op.usesUniverse && universe.size === 0) {
      // Demo fallback: union of the sets plus two extra elements, so the
      // complement has something to show even without an explicit U.
      universe = unionAll(sets);
      if (universe.size > 0) {
        universe.add('x0');
        universe.add('y0');
      }
      universeWasGenerated = rawUniverse === '';
    }

    if (op.kind === 'product') {
      renderProduct(op, sets, names);
      return;
    }

    const result = op.apply(sets, universe);
    const relations = describeRelations(sets, names);

    resultDisplay.innerHTML = `
      <div><strong>${op.title(names)} (\\(${op.tex(names)}\\)):</strong></div>
      <div class="result-set">${formatSet(result)}</div>
      <div class="result-meta">Cardinalidad: ${result.size} ${result.size === 1 ? 'elemento' : 'elementos'}</div>
      ${relations.length ? `<div class="result-relations"><strong>Relaciones adicionales:</strong> ${relations.join(' · ')}</div>` : ''}
    `;

    renderSteps(op.steps({ sets, names, result, universe, universeWasGenerated }));
    renderVennDiagram(vennSvg!, {
      sets,
      names,
      universe,
      isInResult: op.inResult,
      description: `Diagrama de Venn: ${op.title(names)}`,
    });
  }

  function renderProduct(op: ProductOperation, sets: Set<string>[], names: SetName[]): void {
    const tuples = cartesianProduct(...sets);
    const tupleWord = names.length === 3 ? 'tríos' : 'pares';

    if (tuples.length === 0) {
      resultDisplay.innerHTML = `
        <div><strong>${op.title(names)} (\\(${op.tex(names)}\\)):</strong></div>
        <div class="result-set">∅ (Conjunto Vacío)</div>
      `;
    } else {
      const limit = 30;
      const shown = tuples
        .slice(0, limit)
        .map(tuple => `(${tuple.map(escapeHtml).join(', ')})`)
        .join(', ');
      const suffix = tuples.length > limit ? `, … y ${tuples.length - limit} ${tupleWord} más` : '';
      resultDisplay.innerHTML = `
        <div><strong>${op.title(names)} (\\(${op.tex(names)}\\)):</strong></div>
        <div class="result-tuples">{ ${shown}${suffix} }</div>
        <div class="result-meta">Cardinalidad del producto: ${tuples.length} ${tupleWord}</div>
      `;
    }

    const sizesTex = names.map(name => `|${name}|`).join(' \\times ');
    const sizesValues = sets.map(set => set.size).join(' \\times ');
    renderSteps([
      `El producto cartesiano \\(${op.tex(names)}\\) genera ${tupleWord} ordenados combinando cada elemento de ${names.join(', ')}.`,
      `Tamaño del producto: \\(${sizesTex} = ${sizesValues} = ${tuples.length}\\) ${tupleWord}.`,
      `El producto cartesiano no se representa como regiones del diagrama de Venn; se muestran los conjuntos por separado.`,
    ]);
    renderCartesianVenn(vennSvg!, sets, names);
  }
}

/* ==========================================================================
   4. FRACTION CALCULATOR CONTROLLER
   ========================================================================== */
function initFractionCalculator(): void {
  const resultDisplay = $('fraction-result-display');
  const stepsList = $('fraction-steps-list');
  const drawArea = $('svg-fraction-draw-area');
  const visualButtons = {
    pie: $<HTMLButtonElement>('btn-visual-pie'),
    bar: $<HTMLButtonElement>('btn-visual-bar'),
  };

  type VisualType = 'pie' | 'bar';
  let visualType: VisualType = 'pie';
  let currentFraction: Fraction | null = null; // last computed fraction

  const showSteps = (steps: string[]): void => renderStepList(stepsList, resultDisplay, steps);

  function showError(message: string): void {
    resultDisplay.innerHTML = `<div class="result-error">${message}</div>`;
    stepsList.innerHTML =
      '<div class="step-item">Corrige los datos para ver la resolución paso a paso.</div>';
  }

  const fractionHTML = (num: number | string, den: number | string, extraClass = ''): string =>
    `<span class="fraction-display${extraClass ? ` ${extraClass}` : ''}"><span class="num-line">${num}</span><span class="den-line">${den}</span></span>`;

  const equalsSign = '<span class="result-equals">=</span>';

  /** Reads an <input type="number"> as an integer; NaN when empty/decimal. */
  function readInt(id: string): number {
    const raw = input(id).value.trim();
    return /^-?\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
  }

  function renderVisual(): void {
    if (!currentFraction) {
      drawArea.innerHTML =
        '<p class="placeholder-text">Introduce valores para ver la representación visual</p>';
      return;
    }
    const { num, den } = currentFraction;
    if (!Number.isInteger(num) || !Number.isInteger(den) || num < 0 || den <= 0) {
      drawArea.innerHTML =
        '<p class="placeholder-text">La representación gráfica solo está disponible para fracciones con enteros no negativos.</p>';
      return;
    }
    (visualType === 'pie' ? drawFractionPie : drawFractionBar)(drawArea, num, den);
  }

  function setVisualType(type: VisualType): void {
    visualType = type;
    visualButtons.pie.classList.toggle('active', type === 'pie');
    visualButtons.bar.classList.toggle('active', type === 'bar');
    renderVisual();
  }

  visualButtons.pie.addEventListener('click', () => setVisualType('pie'));
  visualButtons.bar.addEventListener('click', () => setVisualType('bar'));

  // --- SUBPANEL 1: Conversion (Mixed / Improper) -------------------------
  $('btn-convert-mixed').addEventListener('click', () => {
    const whole = readInt('mix-whole');
    const num = readInt('mix-num');
    const den = readInt('mix-den');

    if ([whole, num, den].some(Number.isNaN)) {
      return showError('Completa la parte entera, el numerador y el denominador con números enteros.');
    }
    if (whole < 0 || num < 0) return showError('Usa valores no negativos para el número mixto.');
    if (den <= 0) return showError('El denominador debe ser mayor que cero.');

    const result = mixedToImproper(whole, num, den);
    currentFraction = { num: result.numerator, den: result.denominator };

    resultDisplay.innerHTML = `
      <div class="result-fractions-row">
        <div class="mixed-display">
          <span class="mixed-whole">${whole}</span>
          ${fractionHTML(num, den)}
        </div>
        ${equalsSign}
        ${fractionHTML(result.numerator, result.denominator, 'result-fraction')}
      </div>
    `;

    showSteps(result.steps);
    renderVisual();
  });

  $('btn-convert-improper').addEventListener('click', () => {
    const num = readInt('imp-num');
    const den = readInt('imp-den');

    if ([num, den].some(Number.isNaN)) {
      return showError('Completa el numerador y el denominador con números enteros.');
    }
    if (num < 0) return showError('Usa un numerador no negativo.');
    if (den <= 0) return showError('El denominador debe ser mayor que cero.');

    const result = improperToMixed(num, den);
    currentFraction = { num, den };

    const mixedHTML =
      result.whole === 0
        ? fractionHTML(result.numerator, result.denominator, 'result-fraction')
        : `<div class="mixed-display result-fraction">
            <span class="mixed-whole">${result.whole}</span>
            ${result.numerator > 0 ? fractionHTML(result.numerator, result.denominator) : ''}
          </div>`;

    resultDisplay.innerHTML = `
      <div class="result-fractions-row">${fractionHTML(num, den)} ${equalsSign} ${mixedHTML}</div>
    `;

    showSteps(result.steps);
    renderVisual();
  });

  // --- SUBPANEL 2: Simplification ----------------------------------------
  $<HTMLFormElement>('form-simplification').addEventListener('submit', event => {
    event.preventDefault();
    const num = readInt('simp-num');
    const den = readInt('simp-den');

    if ([num, den].some(Number.isNaN)) {
      return showError('Completa el numerador y el denominador con números enteros.');
    }
    if (den === 0) return showError('El denominador no puede ser cero.');

    const result = simplifyFraction(num, den);
    currentFraction = { num: result.numerator, den: result.denominator };

    resultDisplay.innerHTML = `
      <div class="result-fractions-row">
        ${fractionHTML(num, den)}
        ${equalsSign}
        ${fractionHTML(result.numerator, result.denominator, 'result-fraction result-fraction--accent')}
      </div>
    `;

    showSteps(result.steps);
    renderVisual();
  });

  // --- SUBPANEL 3: Missing Value (Equivalent Fraction) --------------------
  const equationFields = ['eq-a', 'eq-b', 'eq-c', 'eq-d'].map(input);
  equationFields.forEach(field =>
    field.addEventListener('input', () => field.classList.remove('solved'))
  );

  $<HTMLFormElement>('form-missing').addEventListener('submit', event => {
    event.preventDefault();

    const isUnknown = (value: string): boolean =>
      value.trim() === '' || value.trim().toLowerCase() === 'x';
    const rawValues = equationFields.map(field => field.value);

    if (rawValues.filter(isUnknown).length !== 1) {
      return showError('Deja exactamente un campo vacío (o con la letra "x") para despejar la incógnita.');
    }

    const values = rawValues.map(value => (isUnknown(value) ? null : Number(value)));
    if (values.some(value => value !== null && !Number.isFinite(value))) {
      return showError('Los valores conocidos deben ser números.');
    }

    const [a, b, c, d] = values as [number | null, number | null, number | null, number | null];
    if (b === 0 || d === 0) return showError('Los denominadores (B y D) no pueden ser cero.');

    // Cross-multiplication divides by the value diagonal to the unknown
    const divisor = a === null ? d : b === null ? c : c === null ? b : a;
    if (divisor === 0) {
      return showError('Con esos valores la incógnita quedaría dividida entre cero; cambia los datos.');
    }

    const result = solveMissingValue(a, b, c, d);

    equationFields.forEach(field => field.classList.remove('solved'));
    const solvedField = equationFields['ABCD'.indexOf(result.variable)]!;
    solvedField.value = fmtNumber(result.value);
    solvedField.classList.add('solved');

    const [solvedA, solvedB, solvedC, solvedD] = equationFields.map(field => Number(field.value)) as [
      number, number, number, number,
    ];

    resultDisplay.innerHTML = `
      <div class="result-headline">¡Resuelto! La incógnita es ${result.variable} = ${fmtNumber(result.value)}</div>
      <div class="result-fractions-row">
        ${fractionHTML(fmtNumber(solvedA), fmtNumber(solvedB))}
        <span>=</span>
        ${fractionHTML(fmtNumber(solvedC), fmtNumber(solvedD))}
      </div>
    `;

    currentFraction = { num: solvedA, den: solvedB };

    showSteps(result.steps);
    renderVisual();
  });

  // --- SUBPANEL 4: LCD Solver ---------------------------------------------
  const lcdList = $('lcd-list');
  const MIN_LCD_ROWS = 2;
  const MAX_LCD_ROWS = 6;

  $('btn-add-lcd-row').addEventListener('click', () => {
    if (lcdList.children.length >= MAX_LCD_ROWS) {
      return showError(`Máximo ${MAX_LCD_ROWS} fracciones para calcular el mínimo común denominador.`);
    }
    const row = document.createElement('div');
    row.className = 'lcd-fraction-row';
    row.innerHTML = `
      <input type="number" class="lcd-num" placeholder="Num" required value="1" aria-label="Numerador">
      <span class="divider-slash">/</span>
      <input type="number" class="lcd-den" placeholder="Den" required min="1" value="4" aria-label="Denominador">
    `;
    lcdList.appendChild(row);
  });

  $('btn-remove-lcd-row').addEventListener('click', () => {
    if (lcdList.children.length <= MIN_LCD_ROWS) {
      return showError('Debes mantener al menos dos fracciones para comparar.');
    }
    lcdList.lastElementChild?.remove();
  });

  $<HTMLFormElement>('form-lcd').addEventListener('submit', event => {
    event.preventDefault();

    const fractions: Fraction[] = [...lcdList.querySelectorAll('.lcd-fraction-row')].map(row => ({
      num: parseInt(row.querySelector<HTMLInputElement>('.lcd-num')?.value ?? '', 10),
      den: parseInt(row.querySelector<HTMLInputElement>('.lcd-den')?.value ?? '', 10),
    }));

    if (fractions.some(f => Number.isNaN(f.num) || Number.isNaN(f.den))) {
      return showError('Rellena el numerador y el denominador de todas las fracciones.');
    }
    if (fractions.some(f => f.den <= 0)) {
      return showError('Los denominadores deben ser enteros mayores que cero.');
    }

    const result = solveLcd(fractions);

    const conversionsHTML = result.convertedFractions
      .map(
        cf => `
          <div class="lcd-conversion">
            ${fractionHTML(cf.originalNum, cf.originalDen)}
            <span class="lcd-scale">(×${cf.scale})</span>
            <span aria-hidden="true">→</span>
            ${fractionHTML(cf.convertedNum, cf.convertedDen, 'lcd-converted')}
          </div>`
      )
      .join('');

    resultDisplay.innerHTML = `
      <div class="result-headline result-headline--primary">Mínimo Común Denominador (MCDen) = ${result.lcd}</div>
      <div class="lcd-conversions">${conversionsHTML}</div>
    `;

    const first = result.convertedFractions[0];
    if (first) {
      currentFraction = { num: first.convertedNum, den: first.convertedDen };
    }

    // steps[1] is a placeholder for the prime-factor table (see solveLcd)
    const steps = [...result.steps];
    steps[1] = `Encuentra el Mínimo Común Múltiplo (MCM) de los denominadores usando la tabla de factores primos:<br>${buildFactorGridTableHTML(result.lcmData)}`;

    showSteps(steps);
    renderVisual();
  });

  function buildFactorGridTableHTML(lcmData: LcmGrid | null): string {
    if (!lcmData || lcmData.rows.length === 0) return '';

    const headerHTML = lcmData.original.map(n => `<th>${n}</th>`).join('') + '<th>Divisor</th>';
    const rowsHTML = lcmData.rows
      .map(row => {
        const valuesHTML = row.values.map(value => `<td>${value}</td>`).join('');
        return `<tr>${valuesHTML}<td class="divisor-col">${row.divisor ?? ''}</td></tr>`;
      })
      .join('');
    const productTex = lcmData.divisors.length ? lcmData.divisors.join(' \\times ') + ' = ' : '';

    return `
      <div class="table-scroll">
        <table class="factor-table">
          <thead><tr>${headerHTML}</tr></thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>
      <div class="factor-table-summary">MCM = \\(${productTex}${lcmData.lcmValue}\\)</div>
    `;
  }
}
