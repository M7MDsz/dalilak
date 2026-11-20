# Darb in three font pairings (drafts for Mohammed, 18 Nov 01:10)

He did not like the font in the Darb sign-in draft (Fustat for headlines + Readex Pro for text). Fustat is not coming back.
Same screens, same layout, only the fonts change. All three are open-source fonts that the product can ship offline.

| Option | Headlines | Text | Character in one line | Sign-in | Home |
|---|---|---|---|---|---|
| 1 | IBM Plex Sans Arabic (bold) | IBM Plex Sans Arabic | Clean, sharp, professional; natural Arabic letter shapes. The lead's pick if no choice comes. | `option-1.png` | `option-1-home.png` |
| 2 | Alexandria (extra bold) | Noto Sans Arabic | Big, heavy, brand-like headlines; the loudest of the three. | `option-2.png` | `option-2-home.png` |
| 3 | Rubik (bold) | Rubik | Rounded and friendly; the most game-like. | `option-3.png` | `option-3-home.png` |

Also here: `_specimen.png` shows the same headline in twelve fonts side by side (IBM Plex Sans Arabic, Tajawal, Alexandria,
Almarai, Zain, Baloo Bhaijaan 2, Rubik, Noto Sans Arabic, El Messiri, Vazirmatn, Cairo, Noto Kufi Arabic), in case he wants
to point at a different one.

To regenerate: `node design/explore/darb/fonts/make.mjs` then `npm run shot -- --steps design/explore/darb/fonts/capture.json`.
