# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EpicPythagoras: an interactive math calculator web app (set operations with Venn diagrams, and fraction tools) built with TypeScript (strict, no framework), Tailwind CSS v4, and Vite. No tests, no linter — `tsc --noEmit` is the only static check. All user-facing text is in Spanish — keep new UI strings and step explanations in Spanish.

## Commands

Uses pnpm.

```bash
pnpm dev        # dev server at http://localhost:5173
pnpm typecheck  # tsc --noEmit
pnpm build      # typecheck + production build to dist/
pnpm preview    # serve the production build
```

There is no test suite; verify changes by running `pnpm typecheck` and the dev server, exercising both calculator tabs.

## Architecture

All static markup lives in `index.html` (two main tab panels: sets and fractions, plus four fraction sub-panels). `src/main.ts` is the single entry point and contains all DOM/controller code; the other modules are pure logic with no DOM access, except the SVG renderers noted below.

- `src/set-parser.ts` — parses user input into `Set`s (comma/space lists, numeric ranges `1-5`/`1..5`, letter ranges `a-e`) and formats output.
- `src/set-calc.ts` — pure set operations (binary plus n-ary variants and an n-ary `cartesianProduct`); re-exports the parser helpers.
- `src/venn-diagram.ts` — SVG Venn renderer (DOM module) for 2 and 3 sets; see geometry notes below.
- `src/math-utils.ts` — gcd/lcm plus `getLcmGridSteps()` (prime-factor divisor table used by the LCD solver).
- `src/fraction-calc.ts` — fraction solvers returning typed step-by-step results, plus the SVG pie/bar renderers (`drawFractionPie`, `drawFractionBar`).

The sets tab works with A and B, plus an optional third set C (`#set-input-c`): filling C switches to a 3-set Venn diagram, relabels the operation buttons, and reveals the C' complement button. Operations in `main.ts` are data-driven (`buildOperations()`, a discriminated union of `standard` and `product` operations): each standard entry declares `apply` (compute), `inResult` (membership predicate that drives Venn region highlighting), labels, and a `steps` generator.

Solver functions return `{ ...resultFields, steps: [...] }` where `steps` is an array of HTML strings that the controller renders into the step list via `innerHTML`. Step strings must NOT include their own "1." numbering — the renderer prepends numbers.

### Styling (Tailwind CSS v4)

`src/style.css` is the only stylesheet: it imports Tailwind (via the `@tailwindcss/vite` plugin — there is no tailwind.config file), defines the theme, and everything else is utilities in `index.html`.

- Theming: raw CSS variables in `:root` (dark, the default) are flipped by `body.light-mode` (toggled from `main.ts`); `@theme inline` maps them to semantic tokens (`text-ink`, `bg-panel`, `border-line`, `bg-field`, `bg-surface*`…), so utilities react to the theme automatically. There's also a `light:` custom variant keyed to `body.light-mode` (used for the theme-toggle icons).
- `@layer components` holds classes that are repeated, toggled from TS (`.active`, `.solved`), or injected as dynamic HTML strings from `main.ts` (`.step-item`, `.result-*`, `.lcd-*`, `.fraction-display`…). Their names must stay in sync with `main.ts` — don't rename one side only.
- SVG diagram classes (`.venn-*`, `.fraction-slice`, `.fraction-bar-*`) are plain CSS at the end of the file because they style SVG paint attributes with theme variables.
- The design-system radii override Tailwind's scale: `rounded-sm`=8px, `rounded-md`=14px, `rounded-lg`=24px.

### MathJax conventions (important)

Step strings embed TeX inside `\(...\)` delimiters (written `\\(...\\)` in TS template literals). MathJax is loaded from CDN in `index.html` and content is injected dynamically, so **any new code path that injects math must end by calling `typesetMath(...)`** (defined in `main.ts`; currently called from `renderStepList`).

- Inside `\(...\)`, format sets with `texSet()` (escapes `{ }` as `\{ \}` — plain braces are TeX grouping and disappear).
- Outside math delimiters, use `formatSet()`.
- User-provided values injected via `innerHTML` must go through `escapeHtml()` (both in `set-parser.ts`).

### Venn diagram geometry

`src/venn-diagram.ts` draws region shapes from the set circles using SVG clip-paths (intersection) and luminance masks (subtraction) — there are no hardcoded arc paths. The `LAYOUTS` table in that file is the single source of truth: 2-set mode uses circles (160,120)/(240,120) r=75 in a 400×250 viewBox; 3-set mode uses (160,112)/(240,112)/(200,179) r=62 in 400×260. The element "spots" (where region elements are placed) in `LAYOUTS` are tuned to those circles — change them together.

## Git

`.claude/` is gitignored (local tooling config). Remote: https://github.com/luismarrer/epic-pythagoras, default branch `main`.
