# Σ EpicPythagoras

Calculadora matemática interactiva con dos herramientas educativas, cada una con explicaciones paso a paso y representaciones visuales.

## Funcionalidades

### Calculadora de Conjuntos
- Operaciones: unión, intersección, diferencia (A − B y B − A), diferencia simétrica, complementos (A′, B′) y producto cartesiano.
- Entrada flexible: listas separadas por comas o espacios, rangos numéricos (`1-5`, `10..15`) y rangos de letras (`a-e`).
- Diagrama de Venn interactivo que resalta la región de la operación y distribuye los elementos en sus regiones.
- Detección de relaciones adicionales: subconjuntos y conjuntos disjuntos.

### Calculadora de Fracciones
- Conversión entre números mixtos y fracciones impropias.
- Simplificación de fracciones (con MCD).
- Resolución de valor faltante en fracciones equivalentes (regla de tres cruzada).
- Mínimo común denominador de hasta 6 fracciones, con tabla de factores primos.
- Visualización en pastel (círculos) o barras.

Las fórmulas se renderizan con [MathJax](https://www.mathjax.org/). Incluye modo claro/oscuro.

## Desarrollo

Requiere [Node.js](https://nodejs.org/) y [pnpm](https://pnpm.io/).

```bash
pnpm install   # instalar dependencias
pnpm dev       # servidor de desarrollo (http://localhost:5173)
pnpm build     # build de producción en dist/
pnpm preview   # previsualizar el build
```

## Stack

- [Vite](https://vite.dev/) — build y servidor de desarrollo
- JavaScript vanilla (ES modules), sin frameworks
- SVG generado dinámicamente para los diagramas
