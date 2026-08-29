// Optional branded cover/receipt page, appended BEHIND the official WH-347.
// Red-team constraint honored here: the official form's pages are never
// altered or watermarked — branding lives only on this separate trailing
// page, and the integrity code describes the document without exposing any
// payroll content. The badge language must never imply DOL or agency
// approval.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const INK = rgb(0.13, 0.14, 0.12);
const SOFT = rgb(0.42, 0.43, 0.38);
const BRAND = rgb(0.64, 0.22, 0.19);

export async function appendCoverSheet(filledPdfBytes, meta = {}, payrollData = null, fonts = null) {
  // The fingerprint identifies the PREPARATION: the payroll data used to fill
  // the form when provided, else the filled two-page PDF bytes before this
  // receipt page was appended. It is deliberately NOT claimed as whole-file
  // integrity of the final PDF (appending this page changes the file).
  const sha = await sha256Hex(
    payrollData ? new TextEncoder().encode(JSON.stringify(payrollData)) : filledPdfBytes,
  );
  const doc = await PDFDocument.load(filledPdfBytes);
  let font, bold;
  if (fonts?.regular) {
    doc.registerFontkit(fontkit);
    font = await doc.embedFont(fonts.regular, { subset: true });
    bold = await doc.embedFont(fonts.bold ?? fonts.regular, { subset: true });
  } else {
    font = await doc.embedFont(StandardFonts.Helvetica);
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  }
  const page = doc.addPage([792, 612]);

  const line = (text, x, y, f = font, size = 10, color = INK) =>
    page.drawText(String(text), { x, y, size, font: f, color });

  line('WeeklyCertified', 56, 540, bold, 22, BRAND);
  line('Certified payroll preparation receipt', 56, 520, font, 11, SOFT);
  page.drawLine({ start: { x: 56, y: 506 }, end: { x: 736, y: 506 }, thickness: 1.2, color: INK });

  let y = 474;
  const row = (label, value) => {
    if (value == null || value === '') return;
    line(label.toUpperCase(), 56, y, bold, 8, SOFT);
    line(value, 200, y, font, 10);
    y -= 22;
  };
  row('Project', meta.projectName);
  row('Payroll no.', meta.payrollNumber);
  row('Week ending', meta.weekEndingDate);
  row('Prepared', meta.preparedAt ?? '');
  row('Wage determination', meta.wageDeterminationNumber);
  if (meta.wdProvenance) row('WD source', meta.wdProvenance);

  y -= 8;
  line('PREPARATION FINGERPRINT (SHA-256)', 56, y, bold, 8, SOFT);
  y -= 14;
  line(sha.slice(0, 32), 56, y, font, 10);
  y -= 12;
  line(sha.slice(32), 56, y, font, 10);
  y -= 26;
  line('Identifies this exact preparation. A saved copy of the payroll can be re-verified against this code.', 56, y, font, 9, SOFT);

  line('Prepared with WeeklyCertified — weeklycertified.com', 56, 96, font, 9, SOFT);
  line(
    'This receipt page is not part of Form WH-347. WeeklyCertified prepared this document from information supplied by the contractor;',
    56, 82, font, 8, SOFT,
  );
  line(
    'it does not certify, approve, or review the payroll, and is not affiliated with the U.S. Department of Labor or any contracting agency.',
    56, 71, font, 8, SOFT,
  );

  return { bytes: await doc.save(), sha256: sha };
}

async function sha256Hex(bytes) {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(bytes).digest('hex');
}
