# New colour sets for Dalilak «دليلك» (colors-2, 18 Nov)

Mohammed asked: "suggest another color like look for other websites like Tuwaig and whatever and give me a new set of
coloring". Below are three new complete schemes, A, B and C. Each was researched from real Saudi and international learning
and careers sites (`_research/notes.md`), drawn on the current design at its original proportions, and checked for contrast.

**The current choice is unchanged:** option 1 of `design/explore/darb/colors/` (navy + coral) is still the product's
palette. Nothing in this folder changes the app. If he picks one of these, the swap is token values only (full list at
the end).

## Look at these pictures

| | Sign-in | Home | Home with the new map (extra) |
|---|---|---|---|
| **A · بحر وورد · Sea & Rose** | `option-A-signin.png` | `option-A-home.png` | `option-A-map.png` |
| **B · قهوة وسماء · Coffee & Sky** | `option-B-signin.png` | `option-B-home.png` | `option-B-map.png` |
| **C · ليل وجمر · Night & Ember** | `option-C-signin.png` | `option-C-home.png` | `option-C-map.png` |
| current (for comparison) | `../colors/option-1-signin.png` | `../colors/option-1-home.png` | `../map/final-home.png` |

## The three at a glance

| Option | Name | Mood | Background | Cards | Text | Dark panel | Accent (label on it) | XP gold (numerals on light) | Success | Warning | Map line |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **A** | بحر وورد · Sea & Rose | Fresh and youthful, cool and confident | `#E6EFEC` | `#FFFFFF` | `#0B2B2C` | `#0A2D30` deep petrol | `#F2447C` rose (`#04191B`) | `#EDAE1F` (`#8A6100`) | `#13753F` | `#A65000` | `#B2CDC6` |
| **B** | قهوة وسماء · Coffee & Sky | Warm, calm, editorial; the most grown-up | `#F4EFE7` | `#FFFDF9` | `#241B15` | `#36241A` coffee brown | `#1A92CB` sky (`#1A120D`) | `#E9A817` (`#885C00`) | `#217437` | `#AA4700` | `#DACDBA` |
| **C** | ليل وجمر · Night & Ember | Night game: dark plum with one glowing ember | `#F0EDF3` | `#FFFFFF` | `#22162F` | `#2B1736` deep plum | `#F26C1E` ember orange (`#1A0F24`) | `#F0C21C` (`#806000`) | `#1F7438` | `#A65000` | `#D2C8E0` |
| current | ليل ومرجان · Navy & Coral | Cool, confident, trustworthy | `#EBF0F6` | `#FFFFFF` | `#0E1E3D` | `#0B1B38` navy | `#F54D38` coral (`#08152F`) | `#EDAA1A` (`#926000`) | `#0B7A53` | `#A85400` | `#BCCBE3` |

**A · بحر وورد · Sea & Rose.** A deep petrol sea for the stage, mint-grey paper, and one rose for "you are here / do
this next". *Inspired by:* the teal family of the Saudi sites (Misk's green-teal, Tuwaiq's teal numerals) taken much deeper,
and Tuwaiq's warm rose buttons used as the single accent (no violet and no pastels, so it does not look like Tuwaiq). The
rose also nods to Taif roses.

**B · قهوة وسماء · Coffee & Sky.** Warm ivory paper, coffee-brown ink and stage, and one clear sky blue. *Inspired by:*
Brilliant's warm paper, near-black ink and single accent (the calmest, most premium site in the research), with the role
of Laracasts' one bright button. The blue is lighter and more cyan than a stock UI blue, with a dark label.

**C · ليل وجمر · Night & Ember.** A deep plum night and one ember-orange light; it echoes the streak campfire. *Inspired by:*
the night stages of Laracasts and Codecademy, where one loud accent owns the screen. The orange stands in for Codecademy's
yellow, because yellow-gold is XP's colour; XP gold was moved slightly towards lemon to stay apart from the orange.

All three keep the Darb rules: flat colour, no gradient washes, no glows, no coloured shadows (shadows are the stage colour
at low opacity, as before); one accent; gold only for XP; green only for success.

## Contrast (WCAG 2.x, computed by `_scratch/contrast.mjs`; full tables in `_scratch/contrast-report.md`)

All 39 text pairs checked per scheme pass 4.5:1 (every text strength on paper, cards and wells; accent, XP, success and warning text on light and on their tints; all stage text on the stage and the raised stage). Every accent button label passes 4.5:1, including hover and pressed.

| Check | A | B | C |
|---|---|---|---|
| text on page (ink / paper) | 12.84 | 14.76 | 14.80 |
| captions (ink-3) on page / on cards | 5.55 / 6.51 | 6.11 / 6.89 | 6.14 / 7.12 |
| label on accent button (normal / pressed) | 5.08 / 4.68 | 5.30 / 4.90 | 6.10 / 5.52 |
| accent headline word on page (large, needs 3) | 3.04 | 3.05 | 4.62 (set in accent-ink, see below) |
| accent-coloured small text on page | 5.26 | 5.14 | 4.62 |
| XP numerals on page | 4.73 | 5.13 | 5.04 |
| success / warning text on page | 4.92 / 4.76 | 5.07 / 5.08 | 5.01 / 4.81 |
| map height figures on the map sheet | 6.14 | 5.82 | 6.44 |
| text on the dark panel (strongest / captions on stage / captions on raised stage) | 13.60 / 5.61 / 4.60 | 13.71 / 5.95 / 4.91 | 15.11 / 6.15 / 5.15 |
| XP gold on the dark panel | 9.58 | 9.43 | 11.48 |
| accent dot on the dark panel (non-text, needs 3) | 4.12 | 4.23 | 5.43 |
| lowest text pair anywhere | 4.57 (warning on its tint) | 4.71 | 4.57 |

## Files

- `option-A.html`, `option-B.html`, `option-C.html`: the current design page (`../colors/option-1.html`) with only the
  colours and the product name changed. The wordmark says «دليلك» everywhere it names the product; the roadmap navigation
  item keeps «مساري». The `:root` block at the top holds each scheme's tokens.
- `option-X-signin.png`, `option-X-home.png`: the two frames, 1600x1000 capture.
- `option-X-map.html` / `option-X-map.png` (extra): a colour-only copy of the map designer's `../map/final-home.html`.
  **It is a snapshot taken at 02:2x while that page was still being worked on.** If the map changes, run
  `node design/explore/darb/colors-2/_scratch/build-map.mjs` and the captures `_scratch/capture-X-map.json` again.
- `_research/`: notes and screenshots of the nine sites.
- `_scratch/`: `palettes.mjs` (every value, including avatar grounds and garments), `build.mjs` (copy, rename, one-pass
  colour remap that reports anything unmapped), `contrast.mjs`, `fit.mjs`, capture files, and the rejected round-1 trials.

## Honest weak points

- **A:** of the three, the rose is the nearest to any brand colour in the research: Tuwaiq's button rose (`#FF536D`).
  The petrol ground and the absence of violet keep it from looking like Tuwaiq, but say so if he likes A. Rose and teal
  also read young and playful; some may find the rose too sweet for a career product.
- **B:** at a glance it is "dark panel + blue button", the same structure as the old option 4 (graphite + cobalt). The
  warm brown and ivory make it a different mood, but the difference is in temperature, not in structure. On a dim projector
  the coffee stage may look almost black.
- **C:** the ember orange and the XP gold are neighbours (orange against lemon-gold). They are distinct, but this is the
  weakest accent/XP separation of the three. The orange is too light to be a 3:1 headline on the page, so the sign-in
  headline word «وظيفتك.» is set in accent-ink `#B5490A`. That is the only change of colour role in this folder. As a
  small mark on bare page background (not on cards) the orange is 2.6:1; on cards it is 3.0:1. Purple with orange can
  look like Halloween if both are used in large amounts: keep the orange to the one accent role. Plum is not the "purple
  AI" look (it is flat and near-black, with no gradient), but it is the boldest of the three.
- **All:** the avatar tier ring for «أسطورة» uses the accent. That comes from the original draft and sits outside the two
  captured frames; the product's avatars follow the design brief (tier colours never use the accent).
- **Rejected on the way:** B with a stock-looking blue `#3789F0` (it read as a default theme and as option 4); C as
  aubergine + jade `#0E9972` (it read as option 3, and the green button looked like the national platforms); an olive + sky
  trial (drab, read as near-black). Their renders are in `_scratch/` (`round1-*`, `option-B2-*`).

## Token values for `src/app/globals.css` (if one is chosen)

| Token (globals.css) | A · Sea & Rose | B · Coffee & Sky | C · Night & Ember |
|---|---|---|---|
| `paper` | `#E6EFEC` | `#F4EFE7` | `#F0EDF3` |
| `sheet` | `#FFFFFF` | `#FFFDF9` | `#FFFFFF` |
| `sunk` | `#D0E0DB` | `#E7DFD3` | `#E0DAE7` |
| `line` | `#C0D3CD` | `#DED4C6` | `#D5CEDE` |
| `line-strong` | `#86A29B` | `#A79A87` | `#9C92AB` |
| `contour` | `#B2CDC6` | `#DACDBA` | `#D2C8E0` |
| `contour-2` | `#8BB1A7` | `#C4B297` | `#B5A6CC` |
| `contour-ink` | `#3B6A61` | `#74614A` | `#66568A` |
| `ink` | `#0B2B2C` | `#241B15` | `#22162F` |
| `ink-2` | `#2A4A49` | `#4B4036` | `#463A55` |
| `ink-3` | `#426461` | `#645749` | `#5F536E` |
| `ink-4` | `#7A9893` | `#9F917F` | `#968CA5` |
| `stage` | `#0A2D30` | `#36241A` | `#2B1736` |
| `stage-2` | `#123C40` | `#47302A` | `#3A2449` |
| `stage-3` | `#2A6266` | `#6E5444` | `#644C7A` |
| `stage-contour` | `#164448` | `#46302A` | `#3A2548` |
| `stage-contour-2` | `#215A5E` | `#5A4034` | `#4C335D` |
| `on-stage` | `#F0F8F6` | `#FBF6EE` | `#F8F4FB` |
| `on-stage-2` | `#AFCDC8` | `#D9CCBA` | `#D2C6DE` |
| `on-stage-3` | `#80A8A1` | `#B3A28D` | `#A898BA` |
| `accent` | `#F2447C` | `#1A92CB` | `#F26C1E` |
| `accent-hover` | `#F13B76` | `#1A90C7` | `#F16513` |
| `accent-press` | `#F1326F` | `#198CC2` | `#ED600E` |
| `accent-soft` | `#FFDBE6` | `#D5EEFA` | `#FFE9DC` |
| `on-accent` | `#04191B` | `#1A120D` | `#1A0F24` |
| `accent-ink` | `#BB1D52` | `#146B95` | `#B5490A` |
| `xp` | `#EDAE1F` | `#E9A817` | `#F0C21C` |
| `xp-line` | `#BD8700` | `#B98200` | `#B48A00` |
| `xp-ink` | `#8A6100` | `#885C00` | `#806000` |
| `xp-soft` | `#F9ECC5` | `#F8EAC4` | `#FAEFC4` |
| `xp-on-stage` | `#FFC94D` | `#FFC64A` | `#FFD34D` |
| `ok` | `#13753F` | `#217437` | `#1F7438` |
| `ok-soft` | `#D3EDDC` | `#D8EDD9` | `#D6ECD6` |
| `warn` | `#A65000` | `#AA4700` | `#A65000` |
| `warn-soft` | `#FCE5CB` | `#FBE3CF` | `#FCE5CB` |

Avatar grounds and brand-coloured garments for each scheme are in `_scratch/palettes.mjs` (`extra`). Skin and hair stay
as they are. For C in the product, an accent word in a large headline on the page should use `accent-ink`, not `accent`.

## Best preview: the new map in each palette (refreshed 02:45 by the lead)

`option-A-map.png`, `option-B-map.png`, `option-C-map.png` show the finished home screen with the new map
(`design/explore/darb/map/final-home.html`) in each palette. The `-signin.png` and `-home.png` files show the earlier
sign-in and home layout in the same palettes.
