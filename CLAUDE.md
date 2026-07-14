# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EpicPythagoras: an interactive math calculator web app (set operations with Venn diagrams, and fraction tools) built with vanilla JavaScript (ES modules) and Vite. No framework, no tests, no linter. All user-facing text is in Spanish — keep new UI strings and step explanations in Spanish.

## Commands

Uses pnpm.

```bash
pnpm dev       # dev server at http://localhost:5173
pnpm build     # production build to dist/
pnpm preview   # serve the production build
```

There is no test suite; verify changes by running the dev server and exercising both calculator tabs.

## Architecture

All static markup lives in `index.html` (two main tab panels: sets and fractions, plus four fraction sub-panels). `src/main.js` is the single entry point and contains all DOM/controller code; the other modules are pure logic with no DOM access, except the SVG renderers noted below.

- `src/set-parser.js` — parses user input into `Set`s (comma/space lists, numeric ranges `1-5`/`1..5`, letter ranges `a-e`) and formats output.
- `src/set-calc.js` — set operations; re-exports the parser helpers; also `distributeElementsInVenn()` which computes element coordinates for the Venn diagram.
- `src/math-utils.js` — gcd/lcm plus `getLcmGridSteps()` (prime-factor divisor table used by the LCD solver).
- `src/fraction-calc.js` — fraction solvers returning step-by-step results, plus the SVG pie/bar renderers (`drawFractionPie`, `drawFractionBar`).

Solver functions return `{ ...resultFields, steps: [...] }` where `steps` is an array of HTML strings that the controller renders into the step list via `innerHTML`.

### MathJax conventions (important)

Step strings embed TeX inside `\(...\)` delimiters (written `\\(...\\)` in JS template literals). MathJax is loaded from CDN in `index.html` and content is injected dynamically, so **any new code path that injects math must end by calling `typesetMath(...)`** (defined in `main.js`; currently called from `renderSteps` and `renderFractionSteps`).

- Inside `\(...\)`, format sets with `texSet()` (escapes `{ }` as `\{ \}` — plain braces are TeX grouping and disappear).
- Outside math delimiters, use `formatSet()`.
- User-provided values injected via `innerHTML` must go through `escapeHtml()` (both in `set-parser.js`).

### Venn diagram geometry

The Venn SVG (drawn in `main.js`) uses a fixed 400×250 viewBox with hardcoded circle paths (centers ~(160,120) and (240,120), r=75). The region centers in `distributeElementsInVenn()` (`set-calc.js`) are tuned to that geometry — change them together.

## Git

`.claude/` is gitignored (local tooling config). Remote: https://github.com/luismarrer/epic-pythagoras, default branch `main`.
