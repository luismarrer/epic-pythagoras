import { gcd, getLcmGridSteps } from './math-utils.js';

/**
 * 1. Convert Mixed Number to Improper Fraction
 * Formula: W (N/D) = (W * D + N) / D
 */
export function mixedToImproper(whole, num, den) {
  whole = Math.abs(parseInt(whole, 10)) || 0;
  num = Math.abs(parseInt(num, 10)) || 0;
  den = Math.abs(parseInt(den, 10)) || 1;
  
  if (den === 0) den = 1;
  
  const resultNum = whole * den + num;
  const steps = [
    `1. Multiplica la parte entera por el denominador: \\(${whole} \\times ${den} = ${whole * den}\\)`,
    `2. Suma el numerador al resultado: \\(${whole * den} + ${num} = ${resultNum}\\)`,
    `3. Escribe el resultado sobre el denominador original: \\(\\frac{${resultNum}}{${den}}\\)`
  ];
  
  return {
    numerator: resultNum,
    denominator: den,
    steps
  };
}

/**
 * 2. Convert Improper Fraction to Mixed Number
 * Formula: N / D = W with remainder R => W (R/D)
 */
export function improperToMixed(num, den) {
  num = Math.abs(parseInt(num, 10)) || 0;
  den = Math.abs(parseInt(den, 10)) || 1;
  
  if (den === 0) den = 1;
  
  const whole = Math.floor(num / den);
  const remainder = num % den;
  
  const steps = [
    `1. Divide el numerador entre el denominador: \\(${num} \\div ${den} = ${whole}\\) residuo \\(${remainder}\\)`,
    `2. La parte entera es el cociente: \\(${whole}\\)`,
    `3. El nuevo numerador es el residuo: \\(${remainder}\\)`,
    `4. Escribe el número mixto: \\(${whole} \\frac{${remainder}}{${den}}\\)`
  ];
  
  return {
    whole,
    numerator: remainder,
    denominator: den,
    steps
  };
}

/**
 * 3. Simplify Fraction
 * Finds GCD and divides both.
 */
export function simplifyFraction(num, den) {
  const sign = (num < 0) ^ (den < 0) ? -1 : 1;
  num = Math.abs(parseInt(num, 10)) || 0;
  den = Math.abs(parseInt(den, 10)) || 1;
  
  if (den === 0) den = 1;
  
  const commonDivisor = gcd(num, den);
  const simplifiedNum = (sign * num) / commonDivisor;
  const simplifiedDen = den / commonDivisor;
  
  const steps = [
    `1. Encuentra el Máximo Común Divisor (MCD) de \\(${num}\\) y \\(${den}\\): MCD = \\(${commonDivisor}\\)`,
    `2. Divide el numerador por el MCD: \\(${num} \\div ${commonDivisor} = ${simplifiedNum}\\)`,
    `3. Divide el denominador por el MCD: \\(${den} \\div ${commonDivisor} = ${simplifiedDen}\\)`,
    `4. Fracción simplificada: \\(\\frac{${simplifiedNum}}{${simplifiedDen}}\\)`
  ];
  
  return {
    numerator: simplifiedNum,
    denominator: simplifiedDen,
    gcdValue: commonDivisor,
    steps
  };
}

/**
 * 4. Solve for Missing Value in Equivalent Fraction: A/B = C/D
 * Exactly one value must be null/empty, represented by 'x'.
 * returns: { solvedValue, steps, decimalValue }
 */
export function solveMissingValue(a, b, c, d) {
  // Identify which one is the variable (represented by null or NaN)
  const isAEmpty = isNaN(a) || a === null;
  const isBEmpty = isNaN(b) || b === null;
  const isCEmpty = isNaN(c) || c === null;
  const isDEmpty = isNaN(d) || d === null;
  
  let solvedVal = 0;
  let steps = [];
  let variable = '';
  
  if (isAEmpty) {
    variable = 'A';
    solvedVal = (b * c) / d;
    steps = [
      `Ecuación original: \\(\\frac{x}{${b}} = \\frac{${c}}{${d}}\\)`,
      `1. Multiplica de forma cruzada: \\(x \\times ${d} = ${b} \\times ${c}\\)`,
      `2. Resuelve la multiplicación: \\(x \\times ${d} = ${b * c}\\)`,
      `3. Divide ambos lados entre \\(${d}\\): \\(x = \\frac{${b * c}}{${d}}\\)`,
      `4. Resultado: \\(x = ${solvedVal % 1 === 0 ? solvedVal : solvedVal.toFixed(3)}\\)`
    ];
  } else if (isBEmpty) {
    variable = 'B';
    solvedVal = (a * d) / c;
    steps = [
      `Ecuación original: \\(\\frac{${a}}{x} = \\frac{${c}}{${d}}\\)`,
      `1. Multiplica de forma cruzada: \\(x \\times ${c} = ${a} \\times ${d}\\)`,
      `2. Resuelve la multiplicación: \\(x \\times ${c} = ${a * d}\\)`,
      `3. Divide ambos lados entre \\(${c}\\): \\(x = \\frac{${a * d}}{${c}}\\)`,
      `4. Resultado: \\(x = ${solvedVal % 1 === 0 ? solvedVal : solvedVal.toFixed(3)}\\)`
    ];
  } else if (isCEmpty) {
    variable = 'C';
    solvedVal = (a * d) / b;
    steps = [
      `Ecuación original: \\(\\frac{${a}}{${b}} = \\frac{x}{${d}}\\)`,
      `1. Multiplica de forma cruzada: \\(x \\times ${b} = ${a} \\times ${d}\\)`,
      `2. Resuelve la multiplicación: \\(x \\times ${b} = ${a * d}\\)`,
      `3. Divide ambos lados entre \\(${b}\\): \\(x = \\frac{${a * d}}{${b}}\\)`,
      `4. Resultado: \\(x = ${solvedVal % 1 === 0 ? solvedVal : solvedVal.toFixed(3)}\\)`
    ];
  } else if (isDEmpty) {
    variable = 'D';
    solvedVal = (b * c) / a;
    steps = [
      `Ecuación original: \\(\\frac{${a}}{${b}} = \\frac{${c}}{x}\\)`,
      `1. Multiplica de forma cruzada: \\(x \\times ${a} = ${b} \\times ${c}\\)`,
      `2. Resuelve la multiplicación: \\(x \\times ${a} = ${b * c}\\)`,
      `3. Divide ambos lados entre \\(${a}\\): \\(x = \\frac{${b * c}}{${a}}\\)`,
      `4. Resultado: \\(x = ${solvedVal % 1 === 0 ? solvedVal : solvedVal.toFixed(3)}\\)`
    ];
  }
  
  // Calculate fractional representation of solvedVal if it's not integer
  let solvedFraction = '';
  if (solvedVal % 1 !== 0) {
    // Write value as unsimplified fraction, then simplify it
    let top = 0;
    let bottom = 0;
    if (isAEmpty) { top = b * c; bottom = d; }
    else if (isBEmpty) { top = a * d; bottom = c; }
    else if (isCEmpty) { top = a * d; bottom = b; }
    else if (isDEmpty) { top = b * c; bottom = a; }
    
    const div = gcd(top, bottom);
    solvedFraction = `\\(\\frac{${top / div}}{${bottom / div}}\\)`;
    steps.push(`En forma de fracción simplificada: ${solvedFraction}`);
  }
  
  return {
    variable,
    value: solvedVal,
    fractionString: solvedFraction,
    steps
  };
}

/**
 * 5. Find Least Common Denominator (LCD) / Mínimo Común Denominador (MCD)
 * Input: list of fractions, e.g. [{num: 1, den: 2}, {num: 2, den: 3}]
 * Returns: { lcd, steps, convertedFractions }
 */
export function solveLcd(fractions) {
  const denominators = fractions.map(f => f.den).filter(d => d > 0);
  if (denominators.length === 0) {
    return { lcd: 1, steps: [], convertedFractions: [] };
  }
  
  // Get LCM steps using divisor table
  const lcmData = getLcmGridSteps(denominators);
  const lcd = lcmData.lcmValue;
  
  const convertedFractions = fractions.map(f => {
    const scale = lcd / f.den;
    return {
      originalNum: f.num,
      originalDen: f.den,
      convertedNum: f.num * scale,
      convertedDen: lcd,
      scale
    };
  });
  
  const steps = [
    `1. Extrae los denominadores de las fracciones: \\(${denominators.join(', ')}\\)`,
    `2. Encuentra el Mínimo Común Múltiplo (MCM) de los denominadores usando la tabla de factores primos.`,
    `3. El MCM de \\(${denominators.join(', ')}\\) es <strong>${lcd}</strong>.`
  ];
  
  convertedFractions.forEach((cf, idx) => {
    steps.push(
      `Para la fracción ${idx + 1} (\\(\\frac{${cf.originalNum}}{${cf.originalDen}}\\)): multiplica el numerador y el denominador por \\(${lcd} \\div ${cf.originalDen} = ${cf.scale}\\): \\(\\frac{${cf.originalNum} \\times ${cf.scale}}{${cf.originalDen} \\times ${cf.scale}} = \\frac{${cf.convertedNum}}{${lcd}}\\)`
    );
  });
  
  return {
    lcd,
    lcmData,
    convertedFractions,
    steps
  };
}

/**
 * Renders SVG Visual Pie Charts representing fractions.
 * Handles mixed and improper fractions by drawing multiple circles.
 */
export function drawFractionPie(container, numerator, denominator, width = 160, height = 160) {
  container.innerHTML = '';
  
  if (denominator <= 0) return;
  
  // Determine how many full circles and remaining slices we need
  const fullCircles = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;
  const totalCircles = remainder > 0 ? fullCircles + 1 : fullCircles;
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  // Scale svg dimension depending on count of circles
  const svgWidth = totalCircles * width;
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', `${height}`);
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${height}`);
  svg.style.maxHeight = '100%';
  
  const cxVal = width / 2;
  const cy = height / 2;
  const r = 55;
  
  for (let c = 0; c < totalCircles; c++) {
    const cx = cxVal + c * width;
    
    // Determine how many slices to fill in this circle
    let filledSlices = denominator;
    if (c === totalCircles - 1 && remainder > 0) {
      filledSlices = remainder;
    }
    
    // Draw slices
    const angleStep = (2 * Math.PI) / denominator;
    
    for (let i = 0; i < denominator; i++) {
      const isFilled = i < filledSlices;
      const startAngle = i * angleStep - Math.PI / 2;
      const endAngle = (i + 1) * angleStep - Math.PI / 2;
      
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      let d = '';
      if (denominator === 1) {
        // Special case: full circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', `${cx}`);
        circle.setAttribute('cy', `${cy}`);
        circle.setAttribute('r', `${r}`);
        circle.setAttribute('class', isFilled ? 'fraction-slice filled' : 'fraction-slice');
        svg.appendChild(circle);
        continue;
      } else {
        d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
      }
      
      path.setAttribute('d', d);
      path.setAttribute('class', isFilled ? 'fraction-slice filled' : 'fraction-slice');
      svg.appendChild(path);
    }
    
    // Add circle border
    const border = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    border.setAttribute('cx', `${cx}`);
    border.setAttribute('cy', `${cy}`);
    border.setAttribute('r', `${r}`);
    border.setAttribute('class', 'fraction-circle-border');
    svg.appendChild(border);
    
    // Add fraction text under the circle
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', `${cx}`);
    text.setAttribute('y', `${cy + r + 18}`);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'fraction-label-text');
    
    if (c < fullCircles) {
      text.textContent = `${denominator}/${denominator} (1)`;
    } else {
      text.textContent = `${remainder}/${denominator}`;
    }
    svg.appendChild(text);
  }
  
  container.appendChild(svg);
}

/**
 * Renders SVG Fraction Bars representing fractions.
 * Draw horizontal strips representing fractional sizes.
 */
export function drawFractionBar(container, numerator, denominator, width = 360, height = 75) {
  container.innerHTML = '';
  if (denominator <= 0) return;
  
  const fullBars = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;
  const totalBars = remainder > 0 ? fullBars + 1 : fullBars;
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const svgHeight = totalBars * height;
  
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', `${svgHeight}`);
  svg.setAttribute('viewBox', `0 0 ${width} ${svgHeight}`);
  svg.style.maxHeight = '100%';
  
  const paddingY = 10;
  const barHeight = 40;
  const innerWidth = width - 40; // 20px padding left/right
  const startX = 20;
  
  for (let b = 0; b < totalBars; b++) {
    const startY = paddingY + b * height;
    
    let filledCount = denominator;
    if (b === totalBars - 1 && remainder > 0) {
      filledCount = remainder;
    }
    
    const segmentWidth = innerWidth / denominator;
    
    // Draw background bar container
    const bgBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgBar.setAttribute('x', `${startX}`);
    bgBar.setAttribute('y', `${startY}`);
    bgBar.setAttribute('width', `${innerWidth}`);
    bgBar.setAttribute('height', `${barHeight}`);
    bgBar.setAttribute('class', 'fraction-bar-bg');
    bgBar.setAttribute('rx', '4');
    svg.appendChild(bgBar);
    
    // Draw filled segments
    for (let i = 0; i < denominator; i++) {
      const isFilled = i < filledCount;
      const segX = startX + i * segmentWidth;
      
      const segment = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      segment.setAttribute('x', `${segX}`);
      segment.setAttribute('y', `${startY}`);
      segment.setAttribute('width', `${segmentWidth}`);
      segment.setAttribute('height', `${barHeight}`);
      segment.setAttribute('class', isFilled ? 'fraction-bar-segment filled' : 'fraction-bar-segment');
      
      // Rounded edges on the corners
      if (denominator === 1) {
        segment.setAttribute('rx', '4');
      } else if (i === 0) {
        segment.setAttribute('rx', '4'); // Left side rounded
        // Mask right-side rounding if there's more segments
        const cover = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        cover.setAttribute('x', `${segX + segmentWidth - 4}`);
        cover.setAttribute('y', `${startY}`);
        cover.setAttribute('width', '4');
        cover.setAttribute('height', `${barHeight}`);
        cover.setAttribute('class', isFilled ? 'fraction-bar-cover filled' : 'fraction-bar-cover');
        svg.appendChild(segment);
        svg.appendChild(cover);
        continue;
      } else if (i === denominator - 1) {
        segment.setAttribute('rx', '4'); // Right side rounded
        // Mask left-side rounding
        const cover = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        cover.setAttribute('x', `${segX}`);
        cover.setAttribute('y', `${startY}`);
        cover.setAttribute('width', '4');
        cover.setAttribute('height', `${barHeight}`);
        cover.setAttribute('class', isFilled ? 'fraction-bar-cover filled' : 'fraction-bar-cover');
        svg.appendChild(segment);
        svg.appendChild(cover);
        continue;
      }
      
      svg.appendChild(segment);
    }
    
    // Draw division tick marks on top
    for (let i = 1; i < denominator; i++) {
      const lineX = startX + i * segmentWidth;
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', `${lineX}`);
      tick.setAttribute('y1', `${startY}`);
      tick.setAttribute('x2', `${lineX}`);
      tick.setAttribute('y2', `${startY + barHeight}`);
      tick.setAttribute('class', 'fraction-bar-divider');
      svg.appendChild(tick);
    }
    
    // Add text label under the bar
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', `${width / 2}`);
    label.setAttribute('y', `${startY + barHeight + 15}`);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'fraction-label-text');
    if (b < fullBars) {
      label.textContent = `Barra entera (${denominator}/${denominator})`;
    } else {
      label.textContent = `Barra fraccionaria (${remainder}/${denominator})`;
    }
    svg.appendChild(label);
  }
  
  container.appendChild(svg);
}
