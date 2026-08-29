// wh347-pdf — fills the official DOL WH-347 (Rev. 01/2025) by overlaying data
// into its boxes. The form's own pages are used untouched: no layout, wording,
// pagination, or OMB header is altered, and nothing is drawn outside the
// form's own fill-in areas. Works in Node and the browser (pdf-lib only).
//
// This library formats what it is given and computes arithmetic per
// lib/wh347-pdf/compute.js. It does not decide classifications, rates, or
// fringe eligibility, and it is not legal advice.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { page1 as P1, page2 as P2 } from './coords.js';
import { computeWorker, cents, fmtHours } from './compute.js';

const INK = rgb(0.05, 0.05, 0.25);
const SIZE = 7;
const MAX_WORKERS = 8;

function drawFit(page, font, text, x, y, maxWidth, size = SIZE, exact = false) {
  if (text == null || text === '') return;
  let s = String(text);
  let sz = size;
  while (sz > 4.5 && font.widthOfTextAtSize(s, sz) > maxWidth) sz -= 0.5;
  if (font.widthOfTextAtSize(s, sz) > maxWidth) {
    // Numbers on a certified payroll must never be silently truncated.
    if (exact) throw new Error(`value "${s}" is too wide for its column`);
    while (s.length > 1 && font.widthOfTextAtSize(s, sz) > maxWidth) s = s.slice(0, -1);
  }
  page.drawText(s, { x, y, size: sz, font, color: INK });
}

function check(page, font, pos) {
  page.drawText('X', { x: pos.x, y: pos.y, size: 8, font, color: INK });
}

const usDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  return `${m}/${d}/${y}`;
};

// Split a long classification onto two lines rather than shrinking it to dust.
function drawWrapped(page, font, text, x, yTop, maxWidth, size = 6) {
  if (!text) return;
  const words = String(text).split(/\s+/);
  if (font.widthOfTextAtSize(String(text), size) <= maxWidth || words.length === 1) {
    drawFit(page, font, text, x, yTop - 4, maxWidth, size);
    return;
  }
  let line1 = '';
  let i = 0;
  while (i < words.length) {
    const next = line1 ? `${line1} ${words[i]}` : words[i];
    if (font.widthOfTextAtSize(next, size) > maxWidth) break;
    line1 = next;
    i++;
  }
  drawFit(page, font, line1, x, yTop, maxWidth, size);
  drawFit(page, font, words.slice(i).join(' '), x, yTop - 8, maxWidth, size);
}

function weekDays(weekEndingISO) {
  // Seven header cells ending on the week-ending date.
  const end = new Date(`${weekEndingISO}T00:00:00`);
  const names = ['SU', 'M', 'TU', 'W', 'TH', 'F', 'SA'];
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    out.push({ day: names[d.getDay()] === undefined ? '' : names[d.getDay()], date: `${d.getMonth() + 1}/${d.getDate()}` });
  }
  return out;
}

export async function fillWh347(officialPdfBytes, payroll, fonts = null) {
  if ((payroll.workers || []).length > MAX_WORKERS) {
    throw new Error(`WH-347 holds ${MAX_WORKERS} workers per sheet; got ${payroll.workers.length}. Split into continuation sheets.`);
  }
  // This library never guesses on a certified document: contractual status,
  // worker type, and plan funding must be stated, and page-1 fringe figures
  // must reconcile with the page-2 plan grid.
  if (!['prime', 'sub'].includes(payroll.role)) {
    throw new Error("role must be 'prime' or 'sub'; the form requires checking exactly one box");
  }
  const comp = payroll.compliance || {};
  const plans = comp.fringePlans || [];
  if (plans.length > 6) throw new Error('the form holds 6 fringe plan columns; provide an addendum for additional plans');
  if ((comp.apprenticePrograms || []).length > 3) throw new Error('the form holds 3 apprenticeship program rows; provide an addendum for more');
  for (const plan of plans) {
    if (plan.funded !== true && plan.funded !== false) {
      throw new Error(`fringe plan "${plan.name ?? ''}": funded must be true or false; the form requires checking one`);
    }
  }
  for (const p of comp.apprenticePrograms || []) {
    if (!['OA', 'SAA'].includes(p.registeredWith)) {
      throw new Error(`apprenticeship program "${p.name ?? ''}": registeredWith must be 'OA' or 'SAA'`);
    }
  }
  (payroll.workers || []).forEach((w, i) => {
    if (!['J', 'RA'].includes(w.type)) {
      throw new Error(`worker ${i + 1}: type must be 'J' (journeyworker) or 'RA' (registered apprentice)`);
    }
    const fc = Math.round((Number(w.fringeCredit) || 0) * 100);
    if (fc > 0) {
      const gridHourly = plans.reduce((sum, p) => sum + Math.round((Number((p.creditsByWorker || [])[i]) || 0) * 100), 0);
      if (Math.abs(gridHourly - fc) > plans.length) {
        throw new Error(`worker ${i + 1}: the 6B fringe credit ($${(fc / 100).toFixed(2)}/hr) must match the page-2 plan credits ($${(gridHourly / 100).toFixed(2)}/hr); list each plan with its hourly credit`);
      }
    }
    const other = Math.round((Number(w.deductions?.other) || 0) * 100);
    if (other > 0 && !w.deductions?.otherLabel && !comp.remarks) {
      throw new Error(`worker ${i + 1}: "other" deductions must be identified; describe them in remarks`);
    }
  });
  const doc = await PDFDocument.load(officialPdfBytes);
  // Embed real fonts when provided so every viewer renders identical widths.
  // Non-embedded "standard Helvetica" gets substituted per-viewer (Android's
  // PDF viewer uses wider metrics), which made values drift across column
  // rules on phones. fonts = { regular, bold } as TTF bytes.
  let font, bold;
  if (fonts?.regular) {
    doc.registerFontkit(fontkit);
    font = await doc.embedFont(fonts.regular, { subset: true });
    bold = await doc.embedFont(fonts.bold ?? fonts.regular, { subset: true });
  } else {
    font = await doc.embedFont(StandardFonts.Helvetica);
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  }
  const [pg1, pg2] = doc.getPages();

  // ---- page 1 header ----
  if (payroll.final) check(pg1, bold, P1.checkboxes.finalSubmission);
  check(pg1, bold, payroll.role === 'prime' ? P1.checkboxes.prime : P1.checkboxes.sub); // role validated above

  const H = P1.header;
  drawFit(pg1, font, payroll.projectName, H.projectName.x, H.projectName.y, 141);
  drawFit(pg1, font, payroll.projectNumber, H.projectNumber.x, H.projectNumber.y, 138);
  drawFit(pg1, font, payroll.payrollNumber, H.payrollNumber.x, H.payrollNumber.y, 90);
  drawFit(pg1, font, payroll.businessName, H.businessName.x, H.businessName.y, 200);
  drawFit(pg1, font, payroll.projectLocation, H.projectLocation.x, H.projectLocation.y, 148);
  drawFit(pg1, font, payroll.wageDeterminationNumber, H.wageDeterminationNumber.x, H.wageDeterminationNumber.y, 138);
  drawFit(pg1, font, usDate(payroll.weekEndingDate), H.weekEndingDate.x, H.weekEndingDate.y, 90);
  drawFit(pg1, font, payroll.businessAddress, H.businessAddress.x, H.businessAddress.y, 200);

  // ---- day/date header cells ----
  // Centered inside each measured day cell; shrink to fit, never cross a
  // day boundary.
  const dayCell = (val, i, y, size) => {
    if (val == null || val === '') return;
    const [l, rr] = P1.dayGrid.cells[i];
    const max = rr - l - 1;
    let sz = size;
    while (sz > 4.5 && font.widthOfTextAtSize(String(val), sz) > max) sz -= 0.25;
    const tw = font.widthOfTextAtSize(String(val), sz);
    if (tw > max) throw new Error(`"${val}" is too wide for its day cell`);
    pg1.drawText(String(val), { x: (l + rr) / 2 - tw / 2, y, size: sz, font, color: INK });
  };
  const days = payroll.days || (payroll.weekEndingDate ? weekDays(payroll.weekEndingDate) : []);
  days.slice(0, 7).forEach((d, i) => {
    dayCell(d.day, i, P1.dayGrid.dayY, 5.5);
    dayCell(d.date, i, P1.dayGrid.dateY, 5.5);
  });

  // ---- worker rows ----
  const T = P1.table.textCells;
  // Identity values stay inside their measured cell: left-aligned 1.5pt in
  // from the cell's own left rule, never wider than the cell.
  const idCell = (page, key, val, y, size = SIZE) => {
    const [left, right] = T[key];
    drawFit(page, font, val, left + 1.5, y, right - left - 3, size);
  };
  const results = [];
  (payroll.workers || []).forEach((w, i) => {
    const row = P1.table.rows[i];
    const mid = row.st + P1.table.midOffset;
    const r = computeWorker(w);
    results.push(r);

    idCell(pg1, 'entryNo', w.entryNo ?? i + 1, mid);
    idCell(pg1, 'lastName', w.lastName, mid);
    idCell(pg1, 'firstName', w.firstName, mid);
    idCell(pg1, 'middleInitial', w.middleInitial, mid);
    // "XXX-XX-1234" is wider than the (1E) cell on one line; the cell is
    // full row height, so split mask and digits onto two legible lines.
    const idm = /^(.*[Xx])-?(\d{4})$/.exec(String(w.idNumber ?? ''));
    if (idm) {
      idCell(pg1, 'idNumber', `${idm[1]}-`, mid + 4, 6);
      idCell(pg1, 'idNumber', idm[2], mid - 4, 6);
    } else {
      idCell(pg1, 'idNumber', w.idNumber, mid, 6);
    }
    idCell(pg1, 'type', w.type, mid);
    drawWrapped(pg1, font, w.classification, T.classification[0] + 1.5, mid + 4, T.classification[1] - T.classification[0] - 3, 6);

    (w.stHours || []).forEach((h, dIdx) => {
      const t = fmtHours(Math.round((Number(h) || 0) * 100));
      if (t) dayCell(t, dIdx, row.st, 6.5);
    });
    (w.otHours || []).forEach((h, dIdx) => {
      const t = fmtHours(Math.round((Number(h) || 0) * 100));
      if (t) dayCell(t, dIdx, row.ot, 6.5);
    });

    // Numeric cells are right-aligned 1.5pt inside the cell's own measured
    // right rule, accountant style; overflow throws rather than crossing a
    // rule or truncating a digit.
    const cell = (key, val, y = mid) => {
      const [left, right] = P1.table.moneyCells[key];
      const max = right - left - 2;
      let sz = 6.5;
      while (sz > 4.5 && font.widthOfTextAtSize(String(val), sz) > max) sz -= 0.5;
      const tw = font.widthOfTextAtSize(String(val), sz);
      if (tw > max) throw new Error(`value "${val}" is too wide for the ${key} column`);
      pg1.drawText(String(val), { x: right - 1 - tw, y, size: sz, font, color: INK });
    };
    if (r.totalSt) cell('totalHours', fmtHours(r.totalSt), row.st);
    if (r.totalOt) cell('totalHours', fmtHours(r.totalOt), row.ot);
    cell('rate', cents(r.rateSt), row.st);
    if (r.totalOt) cell('rate', cents(r.rateOt), row.ot);
    // 6B/6C take the WEEKLY TOTALS per DOL's annotated guide; the hourly
    // credit appears only in page 2's fringe grid.
    if (r.fringeCreditTotal) cell('fringeCredit', cents(r.fringeCreditTotal));
    if (r.cashInLieuTotal) cell('cashInLieu', cents(r.cashInLieuTotal));
    cell('grossProject', cents(r.grossProject));
    cell('grossAll', cents(r.grossAll));
    if (r.dedTax) cell('dedTax', cents(r.dedTax));
    if (r.dedFica) cell('dedFica', cents(r.dedFica));
    if (r.dedOther) cell('dedOther', cents(r.dedOther));
    cell('dedTotal', cents(r.dedTotal));
    cell('net', cents(r.net));
  });

  // ---- page 2 ----
  const c = payroll.compliance || {};
  const H2 = P2.header;
  drawFit(pg2, font, payroll.projectName, H2.projectName.x, H2.projectName.y, 193);
  drawFit(pg2, font, payroll.projectNumber, H2.projectNumber.x, H2.projectNumber.y, 132);
  drawFit(pg2, font, payroll.payrollNumber, H2.payrollNumber.x, H2.payrollNumber.y, 88);
  drawFit(pg2, font, payroll.businessName, H2.businessName.x, H2.businessName.y, 275);
  drawFit(pg2, font, payroll.projectLocation, H2.projectLocation.x, H2.projectLocation.y, 200);
  drawFit(pg2, font, usDate(payroll.weekEndingDate), H2.weekEndingDate.x, H2.weekEndingDate.y, 88);
  drawFit(
    pg2,
    font,
    [c.officialName, c.officialTitle].filter(Boolean).join(', '),
    H2.officialNameTitle.x,
    H2.officialNameTitle.y,
    275,
  );

  const cert = c.certify || {};
  const CB = P2.certifications;
  if (cert.payrollCorrect) check(pg2, bold, CB.payrollCorrect);
  if (cert.recordsComplete) check(pg2, bold, CB.recordsComplete);
  if (cert.classificationsActual) check(pg2, bold, CB.classificationsActual);
  if (cert.apprenticesRegistered) check(pg2, bold, CB.apprenticesRegistered);
  if (cert.fringesPaid) check(pg2, bold, CB.fringesPaid);
  if (cert.wagesFullyPaid) check(pg2, bold, CB.wagesFullyPaid);

  const programs = c.apprenticePrograms || [];
  if (cert.apprenticesRegistered && !programs.length) {
    // Per the annotated guide: when box 4 is checked with no apprentices
    // this period, the program-name row takes "N/A".
    drawFit(pg2, font, 'N/A', P2.apprenticeship.rows[0].nameX, P2.apprenticeship.rows[0].y, 300);
  }
  programs.forEach((p, i) => {
    const row = P2.apprenticeship.rows[i];
    drawFit(pg2, font, p.name, row.nameX, row.y, 300);
    if (p.registeredWith === 'OA') check(pg2, bold, { x: row.oaX, y: row.y });
    if (p.registeredWith === 'SAA') check(pg2, bold, { x: row.saaX, y: row.y });
    drawFit(pg2, font, p.classification, row.classX, row.y, 270);
  });

  const FG = P2.fringeGrid;
  plans.forEach((plan, k) => {
    const col = FG.planCols[k];
    // The value area starts right of the printed FB NAME / FB TYPE / PLAN NO.
    // label sub-cell (divider rule 34.6pt into the column).
    drawFit(pg2, font, plan.name, col.x + 36.1, FG.planNameY, 46, 6);
    drawFit(pg2, font, plan.type, col.x + 36.1, FG.planTypeY, 46, 6);
    drawFit(pg2, font, plan.planNo, col.x + 36.1, FG.planNoY, 46, 6);
    check(pg2, bold, { x: plan.funded === false ? col.unfundedX : col.fundedX, y: FG.fundedY }); // funded validated above
  });
  (payroll.workers || []).forEach((w, i) => {
    const y = FG.rowYs[i];
    const name = [w.lastName, w.firstName].filter(Boolean).join(', ');
    const hasCredit = plans.some((p) => (p.creditsByWorker || [])[i]);
    if (!hasCredit) return;
    drawFit(pg2, font, name, FG.workerNameX, y, 74, 6);
    let total = 0;
    plans.forEach((plan, k) => {
      const credit = (plan.creditsByWorker || [])[i];
      if (credit == null) return;
      total += Math.round(Number(credit) * 100);
      drawFit(pg2, font, Number(credit).toFixed(2), FG.planCols[k].dollarX + 6, y, 36, 6.5, true);
    });
    drawFit(pg2, font, cents(total), FG.totalDollarX + 6, y, 36, 6.5, true);
  });

  drawFit(pg2, font, c.remarks, P2.remarks.x, P2.remarks.y, 700);
  const S = P2.signature;
  drawFit(pg2, font, c.signatureText || '', S.signatureX, S.y, 300);
  drawFit(pg2, font, c.date, S.dateX, S.y, 80);
  const digits = String(c.phone || '').replace(/\D/g, '');
  if (digits.length === 10) {
    const slots = [...S.phone.area, ...S.phone.prefix, ...S.phone.line];
    [...digits].forEach((d, i) => drawFit(pg2, font, d, slots[i], S.phone.y + 2, 8, 8));
  } else if (c.phone) {
    drawFit(pg2, font, c.phone, S.phone.area[0], S.phone.y - 12, 130);
  }
  drawFit(pg2, font, c.email, S.emailX, S.y, 135);

  return { bytes: await doc.save(), results };
}
