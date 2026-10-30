# Astrea Breakpoints

A Figma plugin that shows every screen on every real device. Part of
[Astrea](https://github.com/astrateam-net), the AstraTeam design system.

You draw each route once per breakpoint (`Home`, `Home - Tablet L`,
`Home - Tablet`, `Home - Mobile`, `Home - Wide`). The plugin:

- **builds the device check**: for every route it places the original that
  covers each device's width on that device's frame, in Light and Dark,
  labelled with the device, size and source frame;
- **rebuilds it in one click**: the check page belongs to the plugin and is
  replaced as a whole, so it always matches the originals. Anyone can view it
  without the plugin;
- **reports breakages**: missing originals, content wider than the device,
  clipped text, fixed widths that don't stretch;
- **switches breakpoints**: turns a copy of a screen into another breakpoint
  by switching `Breakpoint` on its nested blocks and setting the frame's
  variable modes.

Frame naming, devices and ranges, variable collections and the variant
property are settings; the defaults are those of the AstraMotors website.

**Status:** early development. Not yet on Figma Community.

## Install

Until the Community release: download the zip from
[Releases](https://github.com/astrateam-net/astrea-figma-breakpoints/releases),
unpack it, then in Figma Desktop choose **Plugins → Development → Import
plugin from manifest…** and pick `manifest.json`.

## Development

Toolchain is pinned with [mise](https://mise.jdx.dev); `mise tasks` lists
everything.

```sh
mise install          # bun, node, hk, pkl; installs the git hooks
bun install
mise run dev          # rebuild on change; import apps/plugin/manifest.json
mise run test         # unit tests (bun test)
mise run typecheck
mise run lint         # Biome
mise run pack         # dist/astrea-figma-breakpoints-<version>.zip
mise run upstream     # reference repos into .upstream/
```

| Path | What |
|---|---|
| `apps/plugin` | The plugin ([create-figma-plugin](https://yuanqing.github.io/create-figma-plugin/)): `main.ts` works on the canvas, `ui.tsx` is the panel |
| `packages/core` | Pure logic with tests, no Figma API: frame names, devices, ranges, build plan, report rules |

## License

[MIT](LICENSE) © AstraTeam
