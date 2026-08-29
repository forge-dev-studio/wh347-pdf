// Dump every text run on the official WH-347 with page coordinates (PDF units,
// origin bottom-left) so the fill engine's coordinate map is measured, not guessed.
import { readFileSync, writeFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const data = new Uint8Array(readFileSync(new URL('../data/wh347-official.pdf', import.meta.url)));
const doc = await getDocument({ data }).promise;
const out = [];
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const { width, height } = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const items = tc.items
    .filter((it) => it.str.trim())
    .map((it) => ({
      str: it.str,
      x: +it.transform[4].toFixed(1),
      y: +it.transform[5].toFixed(1),
      w: +it.width.toFixed(1),
      h: +it.height.toFixed(1),
    }));
  out.push({ page: p, width, height, items });
}
writeFileSync(new URL('../data/wh347-label-coords.json', import.meta.url), JSON.stringify(out, null, 1));
for (const pg of out) {
  console.log(`--- page ${pg.page} ${pg.width}x${pg.height}, ${pg.items.length} text runs`);
}
