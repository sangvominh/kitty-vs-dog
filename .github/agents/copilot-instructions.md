# KT kitty vs MSmini Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-15

## Active Technologies
- TypeScript 5.x (strict mode via tsconfig) + React 19, Phaser 3.90, Zustand 5, TailwindCSS 4, Vite (002-custom-character-sprites)
- IndexedDB (via idb-keyval or raw API) for sprite config persistence; local files in `public/custom-sprites/` git-ignored directory for image blob storage (002-custom-character-sprites)

- TypeScript 5.x (strict mode) + React 18+ (Vite bundler), Phaser 3.80+, Matter.js (via `phaser-matter`), Zustand (state bridge to React UI), TailwindCSS 3+ (001-gameplay-core)

## Project Structure

```text
src/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5.x (strict mode): Follow standard conventions

## Recent Changes
- 002-custom-character-sprites: Added TypeScript 5.x (strict mode via tsconfig) + React 19, Phaser 3.90, Zustand 5, TailwindCSS 4, Vite

- 001-gameplay-core: Added TypeScript 5.x (strict mode) + React 18+ (Vite bundler), Phaser 3.80+, Matter.js (via `phaser-matter`), Zustand (state bridge to React UI), TailwindCSS 3+

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
