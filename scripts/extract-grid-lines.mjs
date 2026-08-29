// Recover the WH-347 page-1 table's vertical rule positions from the PDF's
// vector operators, so column boundaries are measured rather than eyeballed.
import { readFileSync } from 'node:fs';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

const data = new Uint8Array(readFileSync(new URL('../data/wh347-official.pdf', import.meta.url)));
const doc = await getDocument({ data }).promise;
const page = await doc.getPage(1);
const ops = await page.getOperatorList();

const verticals = [];
for (let i = 0; i < ops.fnArray.length; i++) {
  if (ops.fnArray[i] !== OPS.constructPath) continue;
  const [pathOps, coords] = ops.argsArray[i];
  let ci = 0;
  let cur = null;
  for (const op of pathOps) {
    if (op === OPS.moveTo) {
      cur = [coords[ci], coords[ci + 1]];
      ci += 2;
    } else if (op === OPS.lineTo) {
      const nxt = [coords[ci], coords[ci + 1]];
      ci += 2;
      if (cur && Math.abs(nxt[0] - cur[0]) < 0.5 && Math.abs(nxt[1] - cur[1]) > 5) {
        verticals.push({ x: +cur[0].toFixed(1), y1: +Math.min(cur[1], nxt[1]).toFixed(1), y2: +Math.max(cur[1], nxt[1]).toFixed(1) });
      }
      cur = nxt;
    } else if (op === OPS.rectangle) {
      const [x, y, w, h] = coords.slice(ci, ci + 4);
      ci += 4;
      if (Math.abs(w) < 1.2 && Math.abs(h) > 5) {
        verticals.push({ x: +x.toFixed(1), y1: +Math.min(y, y + h).toFixed(1), y2: +Math.max(y, y + h).toFixed(1), rect: true });
      }
    } else if (op === OPS.closePath) {
      cur = null;
    }
  }
}
// Vertical rules crossing the day-grid header band (y ~ 360-410) and the
// hours area, within the (4) column region x 310-445.
const inBand = verticals
  .filter((v) => v.x > 310 && v.x < 448)
  .filter((v) => v.y1 < 400 && v.y2 > 340)
  .sort((a, b) => a.x - b.x);
const uniq = [];
for (const v of inBand) {
  if (!uniq.length || Math.abs(uniq[uniq.length - 1].x - v.x) > 1.5) uniq.push(v);
}
console.log('vertical rules in day-grid region (x, ySpan):');
for (const v of uniq) console.log(`x=${v.x}  y ${v.y1}..${v.y2}`);
// Horizontal rules in the header band, to find the day/date row baselines.
const horiz = [];
for (let i = 0; i < ops.fnArray.length; i++) {
  if (ops.fnArray[i] !== OPS.constructPath) continue;
  const [pathOps, coords] = ops.argsArray[i];
  let ci = 0;
  let cur = null;
  for (const op of pathOps) {
    if (op === OPS.moveTo) { cur = [coords[ci], coords[ci + 1]]; ci += 2; }
    else if (op === OPS.lineTo) {
      const nxt = [coords[ci], coords[ci + 1]]; ci += 2;
      if (cur && Math.abs(nxt[1] - cur[1]) < 0.5 && Math.abs(nxt[0] - cur[0]) > 20) {
        horiz.push({ y: +cur[1].toFixed(1), x1: +Math.min(cur[0], nxt[0]).toFixed(1), x2: +Math.max(cur[0], nxt[0]).toFixed(1) });
      }
      cur = nxt;
    } else if (op === OPS.rectangle) {
      const [x, y, w, h] = coords.slice(ci, ci + 4); ci += 4;
      if (Math.abs(h) < 1.2 && Math.abs(w) > 20) horiz.push({ y: +y.toFixed(1), x1: +x.toFixed(1), x2: +(x + w).toFixed(1) });
    } else if (op === OPS.closePath) cur = null;
  }
}
const hUniq = [];
for (const hv of horiz.filter((h) => h.y > 330 && h.y < 415 && h.x1 < 360 && h.x2 > 400).sort((a, b) => b.y - a.y)) {
  if (!hUniq.length || Math.abs(hUniq[hUniq.length - 1].y - hv.y) > 1.5) hUniq.push(hv);
}
console.log('\nhorizontal rules y 330-415 spanning the grid:');
for (const hv of hUniq) console.log(`y=${hv.y}  x ${hv.x1}..${hv.x2}`);
