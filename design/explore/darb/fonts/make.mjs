// Renders the Darb direction in three different Arabic type pairings (Mohammed did not like Fustat + Readex Pro).
// node design/explore/darb/fonts/make.mjs  -> option-1.html, option-2.html, option-3.html next to this file.
import fs from "node:fs";
import path from "node:path";

const dir = import.meta.dirname;
const source = fs.readFileSync(path.join(dir, "..", "index.html"), "utf8");

const options = [
  { n: 1, display: "IBM Plex Sans Arabic", text: "IBM Plex Sans Arabic", href: "family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700" },
  { n: 2, display: "Alexandria", text: "Noto Sans Arabic", href: "family=Alexandria:wght@400..900&family=Noto+Sans+Arabic:wght@300..800" },
  { n: 3, display: "Rubik", text: "Rubik", href: "family=Rubik:wght@300..900" },
];

for (const o of options) {
  const links = `<link href="https://fonts.googleapis.com/css2?${o.href}&display=swap" rel="stylesheet">`;
  let html = source
    .replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Fustat[^>]*>\s*/, links + "\n")
    .replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Readex\+Pro[^>]*>\s*/, "")
    .replace(/--display:[^;]*;\s*--text:[^;]*;/, `--display:"${o.display}",sans-serif; --text:"${o.text}",sans-serif;`);
  if (html.includes("Fustat\",") || !html.includes(o.display)) throw new Error(`font swap failed for option ${o.n}`);
  fs.writeFileSync(path.join(dir, `option-${o.n}.html`), html);
  console.log(`option-${o.n}.html: ${o.display} + ${o.text}`);
}
