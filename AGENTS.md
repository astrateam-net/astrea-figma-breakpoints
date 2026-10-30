Astrea Breakpoints: a public Figma plugin (MIT, Figma Community) that builds a device check of every route from its breakpoint originals, rebuilds it in one click, reports breakages and switches screens between breakpoints. Part of the Astrea family (`astrea-ui`, `astrea-icons`, `astrea-figma-*`); plugin repos are named `astrea-figma-<purpose>`.

## Layout

- `apps/plugin` — the plugin on create-figma-plugin. `src/main.ts` runs in Figma's sandbox and is the only code that touches nodes; `src/ui.tsx` is the Preact panel; `src/types.ts` holds the typed main ↔ ui events. `manifest.json` is generated from the `figma-plugin` key of `package.json`; never edit it.
- `packages/core` — pure TypeScript, no Figma API, tested with `bun test`: frame-name parsing, devices and ranges, the build plan, report rules. Given the same inputs it returns the same plan; `main.ts` only carries the plan out.

## Conventions

- Tooling mirrors `astrea-ui` (Bun, Turborepo, Biome, TypeScript configs); toolchain pinned in `mise.toml`, `mise tasks` is the task surface, hk hooks only call mise tasks. Dependency versions are exact.
- AstraMotors conventions (frame names `Route — State - Breakpoint`, suffixes `Tablet L` / `Tablet` / `Mobile` / `Wide`, device list, the `Breakpoint` variant property, `Style` / `Mode` collections) are default settings, never hard-coded rules.
- Output must work without the plugin: plain frames, settings and source IDs stored with `setSharedPluginData`. A rebuild builds the new page first and removes the old one only after success; one run is one undo step.
- No network access (`allowedDomains: ["none"]`).
- Plugin API reference: `.upstream/plugin-typings` (the source decides where docs and typings disagree), samples in `.upstream/plugin-samples`.

## Environment

- `.upstream/` holds gitignored reference checkouts (`mise run upstream`).
- Commits are Conventional Commits; no direct commits to `main` (`HK=0` only for repo bootstrap).
