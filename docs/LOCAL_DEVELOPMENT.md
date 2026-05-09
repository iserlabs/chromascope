# Local Development Guide

How to set up, run, and test Chromascope locally.

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 18+ | `node -v` |
| npm | 10+ | `npm -v` |
| Rust toolchain | stable | `rustc --version` |
| Cargo | stable | `cargo --version` |
| Adobe Photoshop | 2024+ (UXP) | Optional -- only for plugin testing |
| Adobe Lightroom Classic | 13+ | Optional -- only for plugin testing |

## Initial Setup

```sh
# 1. Clone and install
git clone <repo-url> && cd chromascope
npm install

# 2. Build everything once (core must build before plugins)
npx turbo build

# 3. Run all tests to verify
npx turbo test
```

## Package-by-Package Workflows

### Core Library (`packages/core`)

The core library is the vectorscope engine -- math, rendering, and UI controls. It bundles to a single HTML file via `vite-plugin-singlefile` for embedding in plugin WebViews.

```sh
cd packages/core

npm run dev          # Vite dev server with hot reload
npm run build        # Production build -> build/
npm run test         # Vitest (single run)
npm run test:watch   # Vitest in watch mode
```

**Dev server**: Opens `src/index.html` -- a standalone harness for testing the vectorscope without a host plugin. The harness at `dev/harness.html` provides additional testing scenarios.

**Key files**:
- `src/main.ts` -- Entry point
- `src/chromascope.ts` -- Core vectorscope implementation
- `src/types.ts` -- `ColorSpaceMapper` and `DensityRenderer` interfaces
- `src/protocol.ts` -- Message protocol types (`PixelsMessage`, `SettingsMessage`, `EditMessage`)
- `src/ui/controls.ts` -- UI control rendering
- `test/chromascope.test.ts` -- Unit tests

**Build dependency**: Plugins depend on the built core library. After modifying core, rebuild before testing plugins.

### Processor Binary (`packages/processor`)

Rust CLI that decodes images and renders vectorscopes. Used by the Lightroom plugin (which can't read pixels or draw from Lua). Supports density modes (scatter, bloom) and harmony overlays.

```sh
cd packages/processor

cargo build             # Debug build
cargo build --release   # Optimized build (for distribution)
cargo test              # Run Rust tests
```

The release binary goes to `target/release/processor`. For Lightroom integration, copy it to the appropriate platform directory:

```
plugins/lightroom/chromascope.lrdevplugin/bin/
  macos-arm64/
  macos-x64/
  win-x64/
```

### Photoshop Plugin (`plugins/photoshop`)

UXP panel plugin. Communicates with the core WebView via the message protocol.

```sh
cd plugins/photoshop

npm run build         # One-time assembly: copy core HTML + IIFE bundle into core/
npm run test          # Pure-render unit tests (vitest, no UXP host needed)
```

The plugin has no watch script — re-run `npm run build` after editing the
core or after making changes to plugin source. The Photoshop UXP Developer
Tool's "Reload" button picks up changes immediately.

**Testing in Photoshop**:

1. Build the core library first: `cd packages/core && npm run build`
2. Build the plugin: `cd plugins/photoshop && npm run build`
3. In Photoshop, go to **Plugins > Development > Load Plugin...**
4. Select `plugins/photoshop/manifest.json`
5. The panel appears under **Plugins > Chromascope**

**Key files**:
- `manifest.json` -- UXP plugin manifest
- `src/main.js` -- Panel entry point, init/teardown, settings wiring
- `src/imaging.js` -- `imaging.getPixels` wrapper (pixel reads)
- `src/events.js` -- Action + userIdle listeners with debounced refresh
- `src/rendering.js` -- Pure software renderer (graticule, density modes, harmony overlay)
- `src/test-harness.js` -- Optional test-mode message handlers
- `index.html` -- Plugin panel HTML (loads `core/scope-bundle.js` then `src/main.js`)
- `core/scope-bundle.js` -- Built core IIFE library (copied during build)

### Lightroom Plugin (`plugins/lightroom`)

Lua plugin for Lightroom Classic. Uses the processor binary to read pixel data.

**Installing for development**:

1. Build the processor binary: `cd packages/processor && cargo build --release`
2. Copy the binary to the plugin's `bin/` directory for your platform
3. Build the core library: `cd packages/core && npm run build`
4. In Lightroom, go to **File > Plug-in Manager > Add**
5. Select the `plugins/lightroom/chromascope.lrdevplugin` directory

**Key files**:
- `Info.lua` -- Plugin metadata and menu registration
- `ShowChromascope.lua` -- Main dialog launcher
- `ChromascopeDialog.lua` -- Floating dialog with vectorscope, controls (density, harmony, rotation, color space, size)
- `ImagePipeline.lua` -- Thumbnail export, single-shot `processor pipeline` invocation (decode+render combined), change detection (recursive djb2 hash of full develop settings), frame alternation, overlay-only re-renders from cached RGB
- `utils.lua` -- Pure helpers (settings hashing, frame-index alternation, `appendOverlayFlags` CLI builder with whitelist)

**Note**: The `.lrdevplugin` extension tells Lightroom this is a development plugin (reloads on each launch). Rename to `.lrplugin` for distribution.

### Website (`web`)

Static HTML marketing site. No build step required — just edit the HTML files directly.

**Key pages**:
- `index.html` -- Landing page
- `download/index.html` -- Download page
- `docs/index.html` -- Documentation hub
- `docs/photoshop/index.html` -- Photoshop manual
- `docs/lightroom/index.html` -- Lightroom Classic manual

## Running Everything at Once

From the repo root:

```sh
npx turbo dev
```

This starts all `dev` scripts in parallel:
- Core library Vite dev server
- Photoshop plugin watch mode

Turborepo handles dependency ordering -- core builds before plugins.

## Build Pipeline

```
packages/core (build)
    |
    +-- plugins/photoshop (build)    # copies core build output
    |
    +-- plugins/lightroom            # manual: copy core + processor binary
    |
packages/processor (cargo build)
    |
    +-- plugins/lightroom            # manual: copy binary to bin/
```

Run the full pipeline:

```sh
npx turbo build                      # TypeScript packages
cd packages/processor && cargo build --release   # Rust binary (separate)
```

## Testing

```sh
# All TypeScript + Rust tests
npx turbo test

# Core library only
cd packages/core && npm run test

# Photoshop plugin (pure rendering unit tests)
cd plugins/photoshop && npm run test

# Rust processor tests
cd packages/processor && cargo test

# Watch mode (core)
cd packages/core && npm run test:watch

# Lightroom Lua util tests (no LrC SDK needed — pure Lua 5.x)
lua tests/e2e/lightroom/lua/test_utils.lua

# Lightroom processor smoke (writes scope PNGs, compares against baselines)
bash tests/e2e/lightroom/smoke.sh

# Photoshop ExtendScript smoke (requires PS running + automation permission)
node tests/e2e/photoshop/smoke.mjs
```

## Linting

```sh
# Lint everything (root invocation — covers every workspace)
npm run lint

# Auto-fix what's safe
npm run lint:fix
```

`eslint.config.mjs` declares overrides per file family (TypeScript core,
Photoshop plugin JS, Node-style scripts, browser-side static-site JS).
If you add a new top-level directory, extend the config with appropriate
globals/sourceType so `npm run lint` stays clean.

## Common Tasks

### Adding a new density renderer

1. Implement `DensityRenderer` interface in `packages/core/src/types.ts`
2. Register in `packages/core/src/main.ts`
3. Add tests and verify

### Updating the core for plugins

1. Make changes in `packages/core/`
2. Run `npx turbo build` from repo root
3. Plugin builds automatically copy the new core output
4. Reload plugin in Photoshop/Lightroom to test

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Module not found` in plugins | Rebuild core first: `cd packages/core && npm run build` |
| Processor binary not found (Lightroom) | Copy release binary to the correct `bin/<platform>/` directory |
| Stale core in Photoshop | Rebuild core, rebuild plugin, then reload in Photoshop |
| Vite HMR not working | Check port conflicts; default is 5173 for core dev server |
| `turbo` not found | Run `npm install` from repo root |
