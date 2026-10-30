# Astrea Breakpoints

A Figma plugin that shows every screen on every real device, with one
button. Part of [Astrea](https://github.com/astrateam-net), the AstraTeam
design system.

You design each screen at a few breakpoints, one frame each: `Home`,
`Home - Tablet L`, `Home - Tablet`, `Home - Mobile`, `Home - Wide`, in Light
and Dark. Real visitors use many more widths. The plugin puts a copy of the
right frame on every device you check, so you can see how each screen
behaves before it reaches code.

## What it does

- **Builds a check page** ("Responsive QA"): one section per route, one row
  per theme, devices left to right by width (phones, tablets, computers).
  Each copy is the original frame resized to the device width, labelled with
  the device, size and source frame; a dashed line marks what fits on the
  screen before scrolling.
- **Shows the truth.** A copy is an exact clone resized like dragging a
  frame's edge, so blocks follow their own constraints and auto layout.
  Nothing inside a copy is adjusted. Copies hold instances of the same
  components, so edits inside blocks show without a rebuild.
- **Updates only what changed.** The page remembers what it was built from.
  The button says **Build**, **Update · N changes** (with the list of new,
  changed and removed routes) or **Up to date**.
- **Reports problems.** Each copy is compared with its original, block by
  block: a block that drifts off centre, one that no longer spans the full
  width, one that sticks out of the screen further than in the original, and
  widths with no frame. A click selects the block; **Copy report** puts a
  Markdown report on the clipboard, with the node of the original to fix.
- **Keeps your setup in the file.** A short setup (page, breakpoints,
  devices, theme collection) is stored in the Figma file, so everyone who
  opens it gets the same check. One build is one undo step; a running build
  can be cancelled.

Frame naming, breakpoints and their widths, the device list and the theme
collection are settings; the defaults follow the AstraMotors website.

Not checked yet: clipped text (the Plugin API doesn't expose whether text is
truncated).

**Status:** early development. Not yet on Figma Community.

## Install

Until the Community release: download the zip from
[Releases](https://github.com/astrateam-net/astrea-figma-breakpoints/releases),
unpack it, then in Figma Desktop choose **Plugins → Development → Import
plugin from manifest…** and pick `manifest.json`.

## How it works

1. **Setup** (first run in a file):
   - **Scan:** pick the page with your screens. A route is a frame name
     without its breakpoint suffix; sections group routes.
   - **Breakpoints:** a name, the frame-name suffix and the width it starts
     at. A device shows the widest breakpoint it reaches.
   - **Devices:** check the devices to test; add custom sizes.
   - **Themes:** the variable collection and modes (Light, Dark) read from
     the frames.
   - **Routes:** which frame each route shows at each breakpoint.
2. **Check:** Build or Update, then read the report.

## Development

Toolchain is pinned with [mise](https://mise.jdx.dev); `mise tasks` lists
everything.

```sh
mise install          # bun, node, hk, pkl; installs the git hooks
mise run install      # dependencies (bun install)
mise run dev          # rebuild on change; import apps/plugin/manifest.json
mise run test         # unit tests (bun test)
mise run typecheck
mise run lint         # Biome
mise run pack         # dist/astrea-figma-breakpoints-<version>.zip
mise run upstream     # reference repos into .upstream/
```

| Path | What |
|---|---|
| `apps/plugin` | The plugin ([create-figma-plugin](https://yuanqing.github.io/create-figma-plugin/), Preact). `main.ts` and `build.ts`, `scan.ts`, `storage.ts` run in Figma and are the only code that touches nodes; `ui.tsx`, `check.tsx` and `setup/` are the panel |
| `packages/core` | Pure logic with tests, no Figma API: frame names, settings, devices, route table, build plan, fingerprints, report |

Code follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
(gts formatting, enforced by Biome). CI runs lint, typecheck, tests and
packs the plugin; a `v*` tag publishes the zip as a release.

## License

[MIT](LICENSE) © AstraTeam
