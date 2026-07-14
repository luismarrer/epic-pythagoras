import { parseSet, formatSet, texSet, escapeHtml, union, intersection, difference, symmetricDifference, cartesianProduct, isSubset, areDisjoint, distributeElementsInVenn } from './set-calc.js';
import { mixedToImproper, improperToMixed, simplifyFraction, solveMissingValue, solveLcd, drawFractionPie, drawFractionBar } from './fraction-calc.js';

// Re-render MathJax formulas after injecting dynamic content
function typesetMath(...elements) {
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise(elements).catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMainTabs();
  initSetCalculator();
  initFractionCalculator();
});

/* ==========================================================================
   1. THEME INITIALIZATION & TOGGLE
   ========================================================================== */
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const storedTheme = localStorage.getItem('theme');
  
  if (storedTheme === 'light') {
    document.body.classList.add('light-mode');
  }
  
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
  });
}

/* ==========================================================================
   2. MAIN TAB NAVIGATION
   ========================================================================== */
function initMainTabs() {
  const tabSets = document.getElementById('tab-sets');
  const tabFractions = document.getElementById('tab-fractions');
  const setsPanel = document.getElementById('sets-panel');
  const fractionsPanel = document.getElementById('fractions-panel');
  
  function switchTab(activeTab, inactiveTab, activePanel, inactivePanel) {
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
    activeTab.setAttribute('tabindex', '0');
    
    inactiveTab.classList.remove('active');
    inactiveTab.setAttribute('aria-selected', 'false');
    inactiveTab.setAttribute('tabindex', '-1');
    
    activePanel.classList.add('active');
    inactivePanel.classList.remove('active');
  }
  
  tabSets.addEventListener('click', () => {
    switchTab(tabSets, tabFractions, setsPanel, fractionsPanel);
  });
  
  tabFractions.addEventListener('click', () => {
    switchTab(tabFractions, tabSets, fractionsPanel, setsPanel);
  });
  
  // Keyboard navigation for tabs
  const tabs = [tabSets, tabFractions];
  tabs.forEach((tab, index) => {
    tab.addEventListener('keydown', (e) => {
      let nextIndex = null;
      if (e.key === 'ArrowRight') {
        nextIndex = (index + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      }
      
      if (nextIndex !== null) {
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
      }
    });
  });
}

/* ==========================================================================
   3. SET CALCULATOR CONTROLLER
   ========================================================================== */
function initSetCalculator() {
  const form = document.getElementById('sets-form');
  const opButtons = document.querySelectorAll('#sets-panel .btn-op');
  const resultDisplay = document.getElementById('set-result-display');
  const stepsList = document.getElementById('set-steps-list');
  const vennSvg = document.getElementById('venn-svg');
  
  let selectedOp = 'union';
  
  // Connect operation button selector
  opButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      opButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedOp = btn.dataset.op;
      
      // Auto recalculate if inputs are already populated
      const valA = document.getElementById('set-input-a').value.trim();
      const valB = document.getElementById('set-input-b').value.trim();
      if (valA || valB) {
        calculateSets();
      }
    });
  });
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateSets();
  });
  
  function calculateSets() {
    const rawA = document.getElementById('set-input-a').value.trim();
    const rawB = document.getElementById('set-input-b').value.trim();
    const rawU = document.getElementById('set-input-u').value.trim();
    
    const setA = parseSet(rawA);
    const setB = parseSet(rawB);
    const setU = parseSet(rawU);
    
    // Auto-populate Universal set if empty and complements are requested
    let finalSetU = new Set(setU);
    if (finalSetU.size === 0 && (selectedOp === 'complement-a' || selectedOp === 'complement-b')) {
      // Create a default union of A and B + some extra variables as a demo fallback
      finalSetU = union(setA, setB);
      // Add a couple of demo variables if U is completely omitted to explain complement
      if (finalSetU.size > 0) {
        finalSetU.add('x0');
        finalSetU.add('y0');
      }
    }
    
    let result = new Set();
    let steps = [];
    let opSymbol = '';
    let opName = '';
    
    switch (selectedOp) {
      case 'union':
        result = union(setA, setB);
        opSymbol = 'A \\cup B';
        opName = 'Unión';
        steps = [
          `El conjunto Unión \\(A \\cup B\\) combina todos los elementos únicos de ambos conjuntos.`,
          `Conjunto A: \\(${texSet(setA)}\\) (cardinalidad: \\(${setA.size}\\))`,
          `Conjunto B: \\(${texSet(setB)}\\) (cardinalidad: \\(${setB.size}\\))`,
          `Elementos recolectados de ambos sin duplicados: \\(${texSet(result)}\\)`
        ];
        break;
        
      case 'intersection':
        result = intersection(setA, setB);
        opSymbol = 'A \\cap B';
        opName = 'Intersección';
        steps = [
          `El conjunto Intersección \\(A \\cap B\\) contiene sólo los elementos que pertenecen a ambos conjuntos al mismo tiempo.`,
          `Conjunto A: \\(${texSet(setA)}\\)`,
          `Conjunto B: \\(${texSet(setB)}\\)`,
          `Elementos comunes encontrados: \\(${texSet(result)}\\)`
        ];
        break;
        
      case 'diff-ab':
        result = difference(setA, setB);
        opSymbol = 'A - B';
        opName = 'Diferencia A − B';
        steps = [
          `La Diferencia \\(A - B\\) contiene los elementos que pertenecen a \\(A\\) pero NO pertenecen a \\(B\\).`,
          `Conjunto A: \\(${texSet(setA)}\\)`,
          `Restando elementos que también están en B (\\(${texSet(intersection(setA, setB))}\\))`,
          `Elementos restantes en A: \\(${texSet(result)}\\)`
        ];
        break;
        
      case 'diff-ba':
        result = difference(setB, setA);
        opSymbol = 'B - A';
        opName = 'Diferencia B − A';
        steps = [
          `La Diferencia \\(B - A\\) contiene los elementos que pertenecen a \\(B\\) pero NO pertenecen a \\(A\\).`,
          `Conjunto B: \\(${texSet(setB)}\\)`,
          `Restando elementos que también están en A (\\(${texSet(intersection(setA, setB))}\\))`,
          `Elementos restantes en B: \\(${texSet(result)}\\)`
        ];
        break;
        
      case 'sym-diff':
        result = symmetricDifference(setA, setB);
        opSymbol = 'A \\Delta B';
        opName = 'Diferencia Simétrica';
        steps = [
          `La Diferencia Simétrica \\(A \\Delta B\\) contiene elementos que están en A o en B, pero no en ambos.`,
          `Es equivalente a la unión de las diferencias: \\((A - B) \\cup (B - A)\\)`,
          `Sólo en A (A - B): \\(${texSet(difference(setA, setB))}\\)`,
          `Sólo en B (B - A): \\(${texSet(difference(setB, setA))}\\)`,
          `Resultado: \\(${texSet(result)}\\)`
        ];
        break;
        
      case 'complement-a':
        result = difference(finalSetU, setA);
        opSymbol = "A'";
        opName = 'Complemento de A';
        steps = [
          `El Complemento de A \\(A'\\) contiene todos los elementos del Conjunto Universal \\(U\\) que NO están en \\(A\\).`,
          `Conjunto Universal U: \\(${texSet(finalSetU)}\\)`,
          `Restando elementos de A: \\(${texSet(setA)}\\)`,
          `Elementos del complemento: \\(${texSet(result)}\\)`
        ];
        if (rawU === '') {
          steps.push(`<em>Nota: Al no proveer un conjunto Universal U, se autogeneró un ejemplo añadiendo ('x0', 'y0') a la unión de A y B para demostración.</em>`);
        }
        break;
        
      case 'complement-b':
        result = difference(finalSetU, setB);
        opSymbol = "B'";
        opName = 'Complemento de B';
        steps = [
          `El Complemento de B \\(B'\\) contiene todos los elementos del Conjunto Universal \\(U\\) que NO están en \\(B\\).`,
          `Conjunto Universal U: \\(${texSet(finalSetU)}\\)`,
          `Restando elementos de B: \\(${texSet(setB)}\\)`,
          `Elementos del complemento: \\(${texSet(result)}\\)`
        ];
        if (rawU === '') {
          steps.push(`<em>Nota: Al no proveer un conjunto Universal U, se autogeneró un ejemplo añadiendo ('x0', 'y0') a la unión de A y B para demostración.</em>`);
        }
        break;
        
      case 'product':
        const prod = cartesianProduct(setA, setB);
        opSymbol = 'A \\times B';
        opName = 'Producto Cartesiano';
        
        // Render Cartesian product
        if (prod.length === 0) {
          resultDisplay.innerHTML = `\\(${opSymbol} = \\emptyset\\) (Conjunto Vacío)`;
        } else {
          const limit = 30;
          const formattedPairs = prod.slice(0, limit).map(p => `(${escapeHtml(p[0])}, ${escapeHtml(p[1])})`).join(', ');
          const limitWarning = prod.length > limit ? `, ... y ${prod.length - limit} pares más` : '';
          resultDisplay.innerHTML = `<div><strong>${opName} (${opSymbol}):</strong></div><div style="font-size: 0.95rem; margin-top: 0.5rem; word-break: break-word;">\\(\\{ ${formattedPairs} \\}\\)${limitWarning}</div><div style="font-size: 0.8rem; margin-top: 0.25rem; color: var(--text-muted);">Cardinalidad del producto: ${prod.length} pares</div>`;
        }
        
        steps = [
          `El Producto Cartesiano \\(A \\times B\\) genera pares ordenados combinando cada elemento de A con cada elemento de B.`,
          `Tamaño del producto = \\(|A| \\times |B| = ${setA.size} \\times ${setB.size} = ${prod.length}\\) pares.`,
          `Este producto no se representa de forma estándar en el diagrama de Venn de 2 conjuntos; se muestra el listado arriba.`
        ];
        
        // Draw empty Venn with a message
        drawCartesianProductVenn(setA, setB);
        renderSteps(steps);
        return;
    }
    
    // Render standard Set Result
    resultDisplay.innerHTML = `<div><strong>${opName} (\\(${opSymbol}\\)):</strong></div><div style="margin-top:0.4rem; font-family: var(--font-mono); font-size:1.15rem;">${formatSet(result)}</div><div style="font-size: 0.85rem; margin-top: 0.25rem; color: var(--text-muted);">Cardinalidad: ${result.size} elementos</div>`;
    
    // Add disjoint / subset relations to results
    const extraRelations = [];
    if (isSubset(setA, setB)) extraRelations.push('A es subconjunto de B (\\(A \\subseteq B\\))');
    if (isSubset(setB, setA)) extraRelations.push('B es subconjunto de A (\\(B \\subseteq A\\))');
    if (areDisjoint(setA, setB)) extraRelations.push('A y B son conjuntos disjuntos (\\(A \\cap B = \\emptyset\\))');
    
    if (extraRelations.length > 0) {
      resultDisplay.innerHTML += `<div style="font-size:0.85rem; color: var(--accent); margin-top:0.5rem; border-top:1px solid var(--panel-border); padding-top:0.4rem;"><strong>Relaciones adicionales:</strong> ${extraRelations.join(' y ')}</div>`;
    }
    
    renderSteps(steps);
    drawVennDiagram(setA, setB, finalSetU, result, selectedOp);
  }
  
  function renderSteps(steps) {
    stepsList.innerHTML = '';
    steps.forEach((step, idx) => {
      const div = document.createElement('div');
      div.className = 'step-item';
      div.innerHTML = `<span class="step-number">${idx + 1}.</span> <div>${step}</div>`;
      stepsList.appendChild(div);
    });
    typesetMath(resultDisplay, stepsList);
  }

  function drawVennDiagram(setA, setB, setU, result, activeOp) {
    vennSvg.innerHTML = '';
    
    // Build background rectangle for Universe
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '10');
    rect.setAttribute('y', '10');
    rect.setAttribute('width', '380');
    rect.setAttribute('height', '230');
    rect.setAttribute('rx', '12');
    rect.setAttribute('class', 'venn-rect');
    if (activeOp === 'complement-a' || activeOp === 'complement-b') {
      rect.classList.add('active-op');
    }
    vennSvg.appendChild(rect);
    
    // Region A crescent: Only A
    const pathA = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathA.setAttribute('d', 'M 200 56.56 A 75 75 0 0 0 200 183.44 A 75 75 0 1 0 200 56.56');
    pathA.setAttribute('class', 'venn-region');
    pathA.setAttribute('id', 'region-only-a');
    if (activeOp === 'union' || activeOp === 'diff-ab' || activeOp === 'sym-diff' || activeOp === 'complement-b') {
      pathA.classList.add('active-op');
    }
    vennSvg.appendChild(pathA);
    
    // Region B crescent: Only B
    const pathB = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathB.setAttribute('d', 'M 200 56.56 A 75 75 0 1 1 200 183.44 A 75 75 0 0 0 200 56.56');
    pathB.setAttribute('class', 'venn-region');
    pathB.setAttribute('id', 'region-only-b');
    if (activeOp === 'union' || activeOp === 'diff-ba' || activeOp === 'sym-diff' || activeOp === 'complement-a') {
      pathB.classList.add('active-op');
    }
    vennSvg.appendChild(pathB);
    
    // Region AB lens: Intersection
    const pathIntersect = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathIntersect.setAttribute('d', 'M 200 56.56 A 75 75 0 0 1 200 183.44 A 75 75 0 0 1 200 56.56');
    pathIntersect.setAttribute('class', 'venn-region');
    pathIntersect.setAttribute('id', 'region-intersect');
    if (activeOp === 'union' || activeOp === 'intersection') {
      pathIntersect.classList.add('active-op');
    }
    vennSvg.appendChild(pathIntersect);
    
    // Venn Set labels
    const labelA = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelA.setAttribute('x', '95');
    labelA.setAttribute('y', '38');
    labelA.setAttribute('class', 'venn-label');
    labelA.textContent = 'Conjunto A';
    vennSvg.appendChild(labelA);
    
    const labelB = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelB.setAttribute('x', '305');
    labelB.setAttribute('y', '38');
    labelB.setAttribute('class', 'venn-label');
    labelB.setAttribute('text-anchor', 'end');
    labelB.textContent = 'Conjunto B';
    vennSvg.appendChild(labelB);
    
    const labelU = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelU.setAttribute('x', '22');
    labelU.setAttribute('y', '30');
    labelU.setAttribute('class', 'venn-label');
    labelU.setAttribute('font-size', '11');
    labelU.style.fill = 'var(--text-muted)';
    labelU.textContent = 'Universo U';
    vennSvg.appendChild(labelU);
    
    // Distribute elements visually in regions
    const onlyA = Array.from(difference(setA, setB));
    const onlyB = Array.from(difference(setB, setA));
    const inter = Array.from(intersection(setA, setB));
    
    // Complement: U - (A + B)
    const unionAB = union(setA, setB);
    const comp = Array.from(difference(setU, unionAB));
    
    // Helper to draw text with threshold
    const drawElementsText = (elements, regionKey) => {
      const displayThreshold = 6;
      let toDisplay = [...elements];
      let hasOverflow = false;
      
      if (elements.length > displayThreshold) {
        toDisplay = elements.slice(0, displayThreshold - 1);
        hasOverflow = true;
      }
      
      const pts = distributeElementsInVenn(toDisplay, regionKey);
      pts.forEach(p => {
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', `${p.x}`);
        txt.setAttribute('y', `${p.y}`);
        txt.setAttribute('class', 'venn-element-text');
        txt.textContent = p.element;
        txt.setAttribute('title', p.element);
        vennSvg.appendChild(txt);
      });
      
      if (hasOverflow) {
        // Place overflow indicator at gravity center + offset
        let ox = 200, oy = 125;
        if (regionKey === 'A') { ox = 125; oy = 155; }
        else if (regionKey === 'B') { ox = 275; oy = 155; }
        else if (regionKey === 'AB') { ox = 200; oy = 165; }
        else if (regionKey === 'U') { ox = 200; oy = 220; }
        
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', `${ox}`);
        txt.setAttribute('y', `${oy}`);
        txt.setAttribute('class', 'venn-element-text');
        txt.style.fill = 'var(--secondary)';
        txt.style.fontWeight = 'bold';
        txt.textContent = `+${elements.length - displayThreshold + 1} más`;
        vennSvg.appendChild(txt);
      }
    };
    
    drawElementsText(onlyA, 'A');
    drawElementsText(onlyB, 'B');
    drawElementsText(inter, 'AB');
    drawElementsText(comp, 'U');
  }
  
  function drawCartesianProductVenn(setA, setB) {
    vennSvg.innerHTML = '';
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '10');
    rect.setAttribute('y', '10');
    rect.setAttribute('width', '380');
    rect.setAttribute('height', '230');
    rect.setAttribute('rx', '12');
    rect.setAttribute('class', 'venn-rect');
    vennSvg.appendChild(rect);
    
    // Draw two non-overlapping circles to show separate inputs
    const cA = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    cA.setAttribute('cx', '120');
    cA.setAttribute('cy', '125');
    cA.setAttribute('r', '65');
    cA.setAttribute('class', 'venn-region');
    cA.style.strokeDasharray = '4 4';
    vennSvg.appendChild(cA);
    
    const cB = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    cB.setAttribute('cx', '280');
    cB.setAttribute('cy', '125');
    cB.setAttribute('r', '65');
    cB.setAttribute('class', 'venn-region');
    cB.style.strokeDasharray = '4 4';
    vennSvg.appendChild(cB);
    
    const labelA = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelA.setAttribute('x', '120');
    labelA.setAttribute('y', '38');
    labelA.setAttribute('class', 'venn-label');
    labelA.setAttribute('text-anchor', 'middle');
    labelA.textContent = 'Conjunto A';
    vennSvg.appendChild(labelA);
    
    const labelB = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelB.setAttribute('x', '280');
    labelB.setAttribute('y', '38');
    labelB.setAttribute('class', 'venn-label');
    labelB.setAttribute('text-anchor', 'middle');
    labelB.textContent = 'Conjunto B';
    vennSvg.appendChild(labelB);
    
    // Add text inside circles listing elements
    const drawElementsInGrid = (elements, cx) => {
      const list = Array.from(elements).slice(0, 4);
      list.forEach((el, idx) => {
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', `${cx}`);
        txt.setAttribute('y', `${95 + idx * 20}`);
        txt.setAttribute('class', 'venn-element-text');
        txt.textContent = el;
        vennSvg.appendChild(txt);
      });
      if (elements.size > 4) {
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', `${cx}`);
        txt.setAttribute('y', '180');
        txt.setAttribute('class', 'venn-element-text');
        txt.style.fill = 'var(--text-muted)';
        txt.textContent = '...';
        vennSvg.appendChild(txt);
      }
    };
    
    drawElementsInGrid(setA, 120);
    drawElementsInGrid(setB, 280);
    
    // Add connection arrow / product cross
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    arrow.setAttribute('x', '200');
    arrow.setAttribute('y', '135');
    arrow.setAttribute('text-anchor', 'middle');
    arrow.setAttribute('font-size', '28');
    arrow.style.fill = 'var(--secondary)';
    arrow.style.fontWeight = 'bold';
    arrow.textContent = '×';
    vennSvg.appendChild(arrow);
  }
}

/* ==========================================================================
   4. FRACTION CALCULATOR CONTROLLER
   ========================================================================== */
function initFractionCalculator() {
  // Main subtabs selectors
  const subtabs = document.querySelectorAll('#fractions-panel .subtab-btn');
  const subpanels = document.querySelectorAll('#fractions-panel .fraction-subpanel');
  const resultDisplay = document.getElementById('fraction-result-display');
  const stepsList = document.getElementById('fraction-steps-list');
  
  // Visual types (pie vs bar) toggle
  const visualBtnPie = document.getElementById('btn-visual-pie');
  const visualBtnBar = document.getElementById('btn-visual-bar');
  const drawArea = document.getElementById('svg-fraction-draw-area');
  
  let currentVisualType = 'pie'; // 'pie' or 'bar'
  let currentFraction = { num: 0, den: 1 };
  
  function updateVisualToggle(activeBtn, inactiveBtn, type) {
    activeBtn.classList.add('active');
    inactiveBtn.classList.remove('active');
    currentVisualType = type;
    renderVisual();
  }
  
  visualBtnPie.addEventListener('click', () => updateVisualToggle(visualBtnPie, visualBtnBar, 'pie'));
  visualBtnBar.addEventListener('click', () => updateVisualToggle(visualBtnBar, visualBtnPie, 'bar'));
  
  function renderVisual() {
    if (currentFraction.den <= 0) {
      drawArea.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem; text-align:center;">Introduce valores para ver la representación visual</p>';
      return;
    }
    
    if (currentVisualType === 'pie') {
      drawFractionPie(drawArea, currentFraction.num, currentFraction.den);
    } else {
      drawFractionBar(drawArea, currentFraction.num, currentFraction.den);
    }
  }

  // Handle Sub-panel tab switches
  subtabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      subtabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');
      
      const targetId = tab.getAttribute('aria-controls');
      subpanels.forEach(panel => {
        if (panel.id === targetId) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });
  
  // SUBPANEL 1: Conversion (Mixed / Improper)
  const btnMixed = document.getElementById('btn-convert-mixed');
  const btnImproper = document.getElementById('btn-convert-improper');
  
  btnMixed.addEventListener('click', () => {
    const whole = parseInt(document.getElementById('mix-whole').value, 10) || 0;
    const num = parseInt(document.getElementById('mix-num').value, 10) || 0;
    const den = parseInt(document.getElementById('mix-den').value, 10) || 1;
    
    if (den === 0) {
      alert('El denominador no puede ser cero.');
      return;
    }
    
    const result = mixedToImproper(whole, num, den);
    currentFraction = { num: result.numerator, den: result.denominator };
    
    resultDisplay.innerHTML = `
      <div class="mixed-display">
        <span class="mixed-whole">${whole}</span>
        <span class="fraction-display">
          <span class="num-line">${num}</span>
          <span class="den-line">${den}</span>
        </span>
      </div>
      <span style="margin:0 0.5rem; font-size:1.5rem;">=</span>
      <span class="fraction-display" style="font-size:1.5rem;">
        <span class="num-line">${result.numerator}</span>
        <span class="den-line">${result.denominator}</span>
      </span>
    `;
    
    renderFractionSteps(result.steps);
    renderVisual();
  });
  
  btnImproper.addEventListener('click', () => {
    const num = parseInt(document.getElementById('imp-num').value, 10) || 0;
    const den = parseInt(document.getElementById('imp-den').value, 10) || 1;
    
    if (den === 0) {
      alert('El denominador no puede ser cero.');
      return;
    }
    
    const result = improperToMixed(num, den);
    currentFraction = { num, den };
    
    if (result.whole === 0) {
      resultDisplay.innerHTML = `
        <span class="fraction-display" style="font-size:1.5rem;">
          <span class="num-line">${num}</span>
          <span class="den-line">${den}</span>
        </span>
        <span style="margin:0 0.5rem; font-size:1.5rem;">=</span>
        <span class="fraction-display" style="font-size:1.5rem;">
          <span class="num-line">${result.numerator}</span>
          <span class="den-line">${result.denominator}</span>
        </span>
      `;
    } else {
      resultDisplay.innerHTML = `
        <span class="fraction-display" style="font-size:1.5rem;">
          <span class="num-line">${num}</span>
          <span class="den-line">${den}</span>
        </span>
        <span style="margin:0 0.5rem; font-size:1.5rem;">=</span>
        <div class="mixed-display">
          <span class="mixed-whole">${result.whole}</span>
          ${result.numerator > 0 ? `
          <span class="fraction-display">
            <span class="num-line">${result.numerator}</span>
            <span class="den-line">${result.denominator}</span>
          </span>` : ''}
        </div>
      `;
    }
    
    renderFractionSteps(result.steps);
    renderVisual();
  });
  
  // SUBPANEL 2: Simplification
  const formSimplification = document.getElementById('form-simplification');
  formSimplification.addEventListener('submit', (e) => {
    e.preventDefault();
    const num = parseInt(document.getElementById('simp-num').value, 10) || 0;
    const den = parseInt(document.getElementById('simp-den').value, 10) || 1;
    
    if (den === 0) {
      alert('El denominador no puede ser cero.');
      return;
    }
    
    const result = simplifyFraction(num, den);
    currentFraction = { num: result.numerator, den: result.denominator };
    
    resultDisplay.innerHTML = `
      <span class="fraction-display" style="font-size:1.5rem;">
        <span class="num-line">${num}</span>
        <span class="den-line">${den}</span>
      </span>
      <span style="margin:0 0.5rem; font-size:1.5rem;">=</span>
      <span class="fraction-display" style="font-size:1.5rem; color:var(--accent);">
        <span class="num-line">${result.numerator}</span>
        <span class="den-line">${result.denominator}</span>
      </span>
    `;
    
    if (result.gcdValue === 1) {
      result.steps.push('La fracción ya se encuentra en sus términos mínimos (ya está simplificada).');
    }
    
    renderFractionSteps(result.steps);
    renderVisual();
  });
  
  // SUBPANEL 3: Missing Value (Equivalent Fraction)
  const formMissing = document.getElementById('form-missing');
  formMissing.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const rawA = document.getElementById('eq-a').value.trim();
    const rawB = document.getElementById('eq-b').value.trim();
    const rawC = document.getElementById('eq-c').value.trim();
    const rawD = document.getElementById('eq-d').value.trim();
    
    // Check which one is the variable x
    const vals = [rawA, rawB, rawC, rawD];
    const xCount = vals.filter(v => v === '' || v.toLowerCase() === 'x').length;
    
    if (xCount !== 1) {
      alert('Debes dejar exactamente un campo vacío (o con la letra "x") para resolver.');
      return;
    }
    
    const a = (rawA === '' || rawA.toLowerCase() === 'x') ? null : parseFloat(rawA);
    const b = (rawB === '' || rawB.toLowerCase() === 'x') ? null : parseFloat(rawB);
    const c = (rawC === '' || rawC.toLowerCase() === 'x') ? null : parseFloat(rawC);
    const d = (rawD === '' || rawD.toLowerCase() === 'x') ? null : parseFloat(rawD);
    
    if ((b === 0) || (d === 0)) {
      alert('Los denominadores (B y D) no pueden ser cero.');
      return;
    }
    
    const result = solveMissingValue(a, b, c, d);
    
    // Re-render inputs to show result inside solved field with highlight
    const fields = {
      'A': document.getElementById('eq-a'),
      'B': document.getElementById('eq-b'),
      'C': document.getElementById('eq-c'),
      'D': document.getElementById('eq-d')
    };
    
    // Clear solved classes
    Object.values(fields).forEach(f => f.classList.remove('solved'));
    
    // Update the solved input field value
    const targetField = fields[result.variable];
    targetField.value = result.value % 1 === 0 ? result.value : result.value.toFixed(2);
    targetField.classList.add('solved');
    
    // Re-fetch numerical representation to draw diagram
    const solvedA = parseFloat(document.getElementById('eq-a').value);
    const solvedB = parseFloat(document.getElementById('eq-b').value);
    const solvedC = parseFloat(document.getElementById('eq-c').value);
    const solvedD = parseFloat(document.getElementById('eq-d').value);
    
    // Render Results Display box
    resultDisplay.innerHTML = `
      <div style="font-size:1.15rem; font-weight:600; color:var(--accent);">
        ¡Resuelto! La incógnita es ${result.variable} = ${result.value % 1 === 0 ? result.value : result.value.toFixed(3)}
      </div>
      <div style="display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-top:0.5rem;">
        <span class="fraction-display">
          <span class="num-line">${solvedA % 1 === 0 ? solvedA : solvedA.toFixed(1)}</span>
          <span class="den-line">${solvedB % 1 === 0 ? solvedB : solvedB.toFixed(1)}</span>
        </span>
        <span>=</span>
        <span class="fraction-display">
          <span class="num-line">${solvedC % 1 === 0 ? solvedC : solvedC.toFixed(1)}</span>
          <span class="den-line">${solvedD % 1 === 0 ? solvedD : solvedD.toFixed(1)}</span>
        </span>
      </div>
    `;
    
    // Set fraction for visualizer to show the solved equivalent fractions
    currentFraction = { num: solvedA, den: solvedB };
    
    renderFractionSteps(result.steps);
    renderVisual();
  });
  
  // SUBPANEL 4: LCD Solver
  const lcdList = document.getElementById('lcd-list');
  const btnAddLcdRow = document.getElementById('btn-add-lcd-row');
  const btnRemoveLcdRow = document.getElementById('btn-remove-lcd-row');
  const formLcd = document.getElementById('form-lcd');
  
  btnAddLcdRow.addEventListener('click', () => {
    const rowCount = lcdList.children.length;
    if (rowCount >= 6) {
      alert('Límite de 6 fracciones para calcular el LCD.');
      return;
    }
    
    const div = document.createElement('div');
    div.className = 'lcd-fraction-row';
    div.dataset.index = rowCount;
    div.innerHTML = `
      <input type="number" class="lcd-num" placeholder="Num" required value="1">
      <span class="divider-slash">/</span>
      <input type="number" class="lcd-den" placeholder="Den" required min="1" value="4">
    `;
    lcdList.appendChild(div);
  });
  
  btnRemoveLcdRow.addEventListener('click', () => {
    const rowCount = lcdList.children.length;
    if (rowCount > 2) {
      lcdList.removeChild(lcdList.lastElementChild);
    } else {
      alert('Debes mantener al menos dos fracciones para comparar.');
    }
  });
  
  formLcd.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const rows = lcdList.querySelectorAll('.lcd-fraction-row');
    const fractions = [];
    let hasError = false;
    
    rows.forEach((row) => {
      const numVal = parseInt(row.querySelector('.lcd-num').value, 10);
      const denVal = parseInt(row.querySelector('.lcd-den').value, 10);
      
      if (isNaN(numVal) || isNaN(denVal)) {
        hasError = true;
      }
      if (denVal === 0) {
        hasError = true;
      }
      
      fractions.push({ num: numVal, den: denVal });
    });
    
    if (hasError) {
      alert('Por favor rellena todos los campos. Los denominadores no pueden ser cero.');
      return;
    }
    
    const result = solveLcd(fractions);
    
    // Display results in vertical equivalent fractions notation list
    let listHTML = result.convertedFractions.map((cf) => {
      return `
        <span class="fraction-display" style="font-size:1.15rem;">
          <span class="num-line">${cf.originalNum}</span>
          <span class="den-line">${cf.originalDen}</span>
        </span>
        <span style="font-size:0.9rem; color:var(--text-muted);">(${cf.scale}x)</span>
        <span>→</span>
        <span class="fraction-display" style="font-weight:700; font-size:1.15rem; color:var(--primary);">
          <span class="num-line">${cf.convertedNum}</span>
          <span class="den-line">${cf.convertedDen}</span>
        </span>
      `;
    }).join('<div style="margin: 0.25rem 0; width:1px; height:15px; border-left:1px dashed var(--panel-border);"></div>');
    
    resultDisplay.innerHTML = `
      <div style="font-size:1.15rem; font-weight:600; color:var(--primary); margin-bottom: 0.75rem;">
        Mínimo Común Denominador (MCDen) = ${result.lcd}
      </div>
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.25rem;">
        ${listHTML}
      </div>
    `;
    
    // Visualizer shows the first converted fraction
    if (result.convertedFractions.length > 0) {
      currentFraction = {
        num: result.convertedFractions[0].convertedNum,
        den: result.convertedFractions[0].convertedDen
      };
    }
    
    // Inject the factor grid table inside steps
    const stepListCopy = [...result.steps];
    const tableHTML = buildFactorGridTableHTML(result.lcmData);
    // Replace step 2 placeholder with the factor table
    stepListCopy[1] = `Encuentra el Mínimo Común Múltiplo (MCM) de los denominadores usando la tabla de factores primos:<br>${tableHTML}`;
    
    renderFractionSteps(stepListCopy);
    renderVisual();
  });
  
  function buildFactorGridTableHTML(lcmData) {
    if (!lcmData || !lcmData.rows || lcmData.rows.length === 0) return '';
    
    let headerHTML = lcmData.original.map(n => `<th>${n}</th>`).join('') + '<th>Divisor</th>';
    
    let rowsHTML = lcmData.rows.map((row) => {
      let valsHTML = row.values.map(val => `<td>${val}</td>`).join('');
      let divHTML = `<td class="divisor-col">${row.divisor !== null ? row.divisor : ''}</td>`;
      return `<tr>${valsHTML}${divHTML}</tr>`;
    }).join('');
    
    let divisorsProduct = lcmData.divisors.join(' \\times ');
    
    return `
      <table class="factor-table">
        <thead>
          <tr>${headerHTML}</tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
      <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.4rem; font-family: var(--font-mono);">
        MCM = \\(${divisorsProduct} = ${lcmData.lcmValue}\\)
      </div>
    `;
  }
  
  function renderFractionSteps(steps) {
    stepsList.innerHTML = '';
    steps.forEach((step, idx) => {
      const div = document.createElement('div');
      div.className = 'step-item';
      div.innerHTML = `<span class="step-number">${idx + 1}.</span> <div>${step}</div>`;
      stepsList.appendChild(div);
    });
    typesetMath(resultDisplay, stepsList);
  }
}
