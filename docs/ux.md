# Screens and behaviour

The plugin's UI and behaviour. Status: agreed 2026-10-30; screens are built
step by step (built so far: storage, scan, step 1).

Decisions are based on how mature open-source plugins solve the same
problems (Tokens Studio, eBay Include, FigmaToCode, design-tokens,
Polychrom, yuanqing/figma-plugins), checked against the current Plugin API
typings, which offer more than those plugins use (`commitUndo`, `notify`
buttons, `textTruncation`, `absoluteRenderBounds`).

## Decisions

| Topic | Decision |
|---|---|
| Settings storage | In the file: `figma.root.setSharedPluginData('astreabreakpoints', 'settings.N')`, chunked under the 100 kB entry limit, with a format version; loaded through `normalizeSettings` (defaults merged, invalid entries dropped). Last tab and window size are per user (`clientStorage`). |
| Window model | First run in a file: a 5-step wizard. Afterwards: tabs. |
| Window size | 480 × 560, resizable, size remembered per user. |
| Rescan | On open and on Rescan; not on every document change. |
| Manual picks | Stored by frame ID; a deleted frame shows as "Frame deleted". |
| Canvas | Changes only on Build; everything else is a preview in the panel. |
| Undo | One Build = one undo step (`commitUndo`). Cancel removes what was built so far; the old page stays. |
| Own output | Marked with plugin data (`role`), found by the mark, never by name; never scanned as originals. |
| JSON import | Shows the changes first, then "Replace settings". |
| Problem levels | Error: missing original, content wider than the screen. Warning: clipped text, theme mode not set. |
| Relaunch buttons | Check page: "Rebuild". Each copy: "Show original". |
| Network | None (`allowedDomains: ["none"]`). |

## Map

```
First run in a file              Later runs
───────────────────              ───────────────────────────────────────────
1 Scan                           [Check] Routes  Breakpoints  Devices  Themes  ⋯
2 Breakpoints                       ├ Build / progress / result              └ Import JSON
3 Devices                           └ Report                                   Export JSON
4 Themes                                                                       Reset settings
5 Routes → Finish → Check tab
```

## Wizard

Every step has `Back` · `Next` (`Finish` on the last). `Next` is disabled
while a step has an error. Enter = `Next`, Escape closes.

### 1 · Scan

```
Where are your screens?
Page      [ Website                              ▾ ]

Found 3 routes, 14 frames
  Public     ▢ Home                      10 frames
  Account    ▢ Account / Garage           2 frames
  Overlays   ▢ Sign in                    2 frames
```

Routes are frame names without the breakpoint suffix; the outermost section
groups them. Clicking a route selects its frames on the canvas. Empty page:
"No frames on this page. Pick the page where your screens are."

### 2 · Breakpoints

Prefilled from the suffixes found; "from" defaults to the drawn width.

```
Breakpoints
A device uses the widest breakpoint whose "from" it reaches.

 Name        Frame name ends with    From          Frames
 Mobile      " - Mobile"             [  320 ] px     2
 Tablet      " - Tablet"             [  600 ] px     2
 Tablet L    " - Tablet L"           [  960 ] px     2
 Desktop     (no suffix)             [ 1280 ] px     6   🗑
 Wide        " - Wide"               [ 1920 ] px     2   🗑
 + Add breakpoint
```

Widths sort themselves; a duplicate or empty value is an error on the field.

### 3 · Devices

```
Devices to check                           [ Search…     ]
 ▾ Phones
    ☑ iPhone 16            393 × 852    → Mobile
    ☑ iPhone 18 Pro        402 × 874    → Mobile
    ☐ Small phone          320 × 568    → Mobile
 ▸ Tablets (3 of 4)
 ▸ Computers (3 of 5)
 + Custom size   [ name ] [ W ] × [ H ]
```

The right column shows which breakpoint the device gets (from step 2); a
dropdown overrides it.

### 4 · Themes

```
Themes
Collection   [ Mode (astrea-ui Kit)                  ▾ ]
  ☑ Light    ☐ Dark
Frames: Light 7 · Dark 7 · not set 0
```

A frame's theme is its resolved mode in this collection. The collection set
on most frames with more than one mode is preselected.

### 5 · Routes

```
Routes                                          [ Rescan ]
               Mobile    Tablet    Tablet L  Desktop  Wide
Home            ✓ L D     ✓ L D     ✓ L D     ✓ L D   ✓ L D
Account/Garage  —         —         —         ✓ L     —
Sign in         ✓ L       —         —         —       —

Click a cell to see its frame.   ◎ Pick from canvas
```

Click a cell: select the frame and zoom. "Pick from canvas": select a frame
on the canvas to put it in the cell; anything else gives an error
notification. Every cell also offers "None".

## Check tab

```
[Check]  Routes  Breakpoints  Devices  Themes                ⋯

Build a check page from 3 routes on 9 devices, Light.
Page: Responsive QA (rebuilt as a whole)                [ Build ]
──────────────────────────────────────────────────────────────
Last build: today 14:20 · 2 errors · 1 warning
 ▾ ✘ Missing original (1)
     Home · Mobile — 6 phones show "No frame"
 ▾ ✘ Wider than the screen (1)
     Home · iPhone 16 · Promotions overflows by 24 px
 ▸ ⚠ Clipped text (1)
```

- While building: fields disabled, Build shows `loading`; a progress line
  ("Home 2 / 3 · iPhone 16") updated at most once a second, and `Cancel`. A
  spinner only after 250 ms.
- Result: one counted notification ("✔ Built 27 frames, 2 errors") with an
  "Undo" button; the page is selected and zoomed.
- A report row selects the layer on the check page; a second icon opens the
  original.
- Overflow uses `absoluteRenderBounds`; frames with `overflowDirection` set
  (intended scrolling, e.g. carousels) are not errors. Clipped text uses
  `textTruncation` / `maxLines`.
- Menu ⋯: Import JSON (with a preview of changes), Export JSON, Reset settings
  (with confirmation).

The other tabs are steps 2–5 without Back / Next.

## Check page on the canvas

```
Responsive QA
┌ Home ─────────────────────────────────────────────────────────────────┐
│ Phones     [iPhone 16 393] [iPhone 18 Pro 402] [Android 412] …        │
│ Tablets    [iPad mini 744] [iPad Pro 11 834] [iPad Pro 12.9 1024]     │
│ Computers  [MacBook Air 1280] [Desktop 1440] [MacBook Pro 14 1512]    │
└───────────────────────────────────────────────────────────────────────┘
┌ Account / Garage ─ …
```

- A section per route, a row per device group; each copy is labelled with
  the device, size and source frame.
- A copy is a frame of the device's size holding the original's content
  (instances of the same blocks, so block edits show without a rebuild).
- No original: a grey placeholder "No frame for Mobile" of the same size.
- With Dark on: a second row under each.
- The page works without the plugin; only the plugin rebuilds it.
