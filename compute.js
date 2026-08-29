// Deterministic pay math for a WH-347 worker row. All money math is in
// integer cents; hours in hundredths of an hour. Davis-Bacon overtime is at
// least 1.5x the BASIC hourly rate (fringe is owed per hour worked but is
// not multiplied for OT). Two deliberate policies, chosen so the printed
// form always ties out AND never pays under the legal minimum:
//   * a derived OT rate with a half-cent rounds UP (never below 1.5x basic);
//   * gross is accumulated exactly (hundredth-hour x cent units) and rounded
//     once, not per component.
// Inputs are validated: absent optional values mean zero, but garbage or
// non-finite values throw instead of silently computing $0. (Both policies
// and the validation exist because an adversarial review found the failure
// modes; see repo history.)

const parseAmount = (v, field) => {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'string' && /^\d{1,7}(\.\d{1,4})?$/.test(v.trim())) {
    // Decimal strings parse via string math so binary-float ties (1.005)
    // cannot round down.
    const [whole, frac = ''] = v.trim().split('.');
    return Number(whole) * 100 + Math.round(Number((frac + '0000').slice(0, 4)) / 100);
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) {
    throw new TypeError(`Invalid amount for ${field}: ${String(v).slice(0, 20)}`);
  }
  return Math.round(n * 100);
};

const toCents = parseAmount;
const toHund = (v, field) => {
  const h = parseAmount(v, field);
  if (h > 2400) throw new TypeError(`${field}: more than 24 hours in a day`);
  return h;
};

export const cents = (c) => (c / 100).toFixed(2);

const hoursArray = (v, field) => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new TypeError(`${field} must be an array of daily hours`);
  if (v.length > 7) throw new TypeError(`${field}: more than 7 days in a workweek`);
  return v.map((h, i) => toHund(h, `${field}[${i}]`));
};

export function computeWorker(w) {
  const st = hoursArray(w.stHours, 'stHours');
  const ot = hoursArray(w.otHours, 'otHours');
  const totalSt = st.reduce((a, b) => a + b, 0); // hundredths of hours
  const totalOt = ot.reduce((a, b) => a + b, 0);
  const totalHours = totalSt + totalOt;

  const rateSt = toCents(w.rateSt, 'rateSt');
  if (totalHours > 0 && rateSt <= 0) {
    throw new TypeError('worker has hours but no base hourly rate; a certified $0.00 rate would be a fabrication');
  }
  // Derived OT: 1.5x basic, half-cents rounded UP so the printed rate never
  // pays below the legal minimum. An explicitly supplied rate is taken as-is.
  const rateOt = w.rateOt != null && w.rateOt !== '' ? toCents(w.rateOt, 'rateOt') : Math.ceil(rateSt * 1.5);
  const cashInLieu = toCents(w.cashInLieu, 'cashInLieu'); // per-hour cash in lieu of fringes (6C)
  const fringeCredit = toCents(w.fringeCredit, 'fringeCredit'); // per-hour bona fide plan credit (6B)

  // Exact accumulation in hundredth-hour x cent units (1e-4 dollars), one
  // rounding at the end. Plan fringe credit is not cash and never enters gross.
  const grossProject = Math.round(
    (totalSt * rateSt + totalOt * rateOt + totalHours * cashInLieu) / 100,
  );

  // (7B): gross for ALL work that week (this project + any other work). If
  // absent, all work was on this project.
  const grossAll = w.grossAllWork != null && w.grossAllWork !== '' ? toCents(w.grossAllWork, 'grossAllWork') : grossProject;

  // Page-1 columns 6B and 6C take the WEEKLY TOTALS (hours x the hourly
  // figure); the hourly credit itself belongs only in page 2's fringe grid.
  // Verified against DOL's annotated guide for the Jan-2025 revision.
  const fringeCreditTotal = Math.round((totalHours * fringeCredit) / 100);
  const cashInLieuTotal = Math.round((totalHours * cashInLieu) / 100);

  const d = w.deductions || {};
  const dedTax = toCents(d.tax, 'deductions.tax');
  const dedFica = toCents(d.fica, 'deductions.fica');
  const dedOther = toCents(d.other, 'deductions.other');
  const dedTotal = dedTax + dedFica + dedOther;
  const net = grossAll - dedTotal;

  return {
    totalSt, totalOt, totalHours,
    rateSt, rateOt, fringeCredit, cashInLieu,
    fringeCreditTotal, cashInLieuTotal,
    grossProject, grossAll,
    dedTax, dedFica, dedOther, dedTotal, net,
  };
}

export const fmtHours = (hund) => {
  if (!hund) return '';
  return hund % 100 === 0 ? String(hund / 100) : (hund / 100).toFixed(2).replace(/0$/, '');
};
