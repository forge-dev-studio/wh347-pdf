// Measured coordinate map for the official WH-347 (Rev. January 2025,
// OMB 1235-0008, expires 01/31/2028). All values are PDF points, origin
// bottom-left, pages 792x612 (landscape US Letter). Derived from the form's
// own printed labels via pdfjs text extraction (data/wh347-label-coords.json),
// then nudged by visual calibration against rendered output. If DOL revises
// the form, re-run scripts/extract-label-coords.mjs and re-calibrate — never
// assume the layout carried over.

export const FORM_REV = '2025-01';

export const page1 = {
  checkboxes: {
    finalSubmission: { x: 42.5, y: 505 },
    prime: { x: 434, y: 505 },
    sub: { x: 578, y: 505 },
  },
  // Header boxes: label prints at labelY; the value is written inside the box
  // below the label.
  header: {
    projectName: { x: 47, y: 466 },
    projectNumber: { x: 202, y: 466 },
    payrollNumber: { x: 348, y: 466 },
    businessName: { x: 446, y: 466 },
    projectLocation: { x: 47, y: 434.5 },
    wageDeterminationNumber: { x: 202, y: 434.5 },
    weekEndingDate: { x: 348, y: 434.5 },
    businessAddress: { x: 446, y: 434.5 },
  },
  // Day-of-week / date header cells for column (4): 7 sub-columns.
  // Measured from the form's vector rules: 7 cells between verticals at
  // x 341.4 / 355.6 / 367.8 / 380.2 / 392.5 / 404.9 / 417.2 / 430.4; each cell
  // stacks day (top) and date (bottom) inside the y 376.2-389.6 band.
  dayGrid: {
    // Seven day cells [leftRule, rightRule], measured from the form's own
    // vector rules. Each cell also carries a cosmetic inset tick ~4pt inside
    // its right rule (insetX); values are too wide to respect it, so they
    // center across the full cell and the bleed gate whitelists those ticks.
    cells: [
      [340.6, 355.2], [355.2, 367.6], [367.6, 379.9], [379.9, 392.3],
      [392.3, 404.6], [404.6, 417.0], [417.0, 430.2],
    ],
    insetX: [351.2, 363.6, 376.0, 388.2, 400.6, 412.9, 426.1],
    dayY: 383.6,
    dateY: 377.0,
  },
  table: {
    // Identity cells measured from the form's own vertical rules (same method
    // as moneyCells; the old left-edge-plus-guessed-width numbers let long
    // values cross rules — the SSN bled 13pt into the J/RA column).
    // [leftRule, rightRule] in PDF points.
    textCells: {
      entryNo: [41.8, 65.6], // (1A)
      lastName: [65.6, 115.7], // (1B)
      firstName: [115.7, 165.2], // (1C)
      middleInitial: [165.2, 190.2], // (1D)
      idNumber: [190.2, 221.0], // (1E)
      type: [221.0, 256.0], // (2) J / RA
      classification: [256.0, 300.4], // (3)
    },
    // Money/hours cells measured from the form's own vertical rules in the
    // worker-row band (NOT from header label positions, which are centered
    // and misled an earlier version). [leftRule, rightRule] in PDF points.
    // Right bound is each column's INSET writable box edge (a second rule
    // ~4.3pt inside the outer column rule); aligning to the outer rule put
    // digits on the dead gutter and read as bleed.
    moneyCells: {
      totalHours: [430.4, 452.9],
      rate: [469.6, 493.8],
      fringeCredit: [498.1, 520.2],
      cashInLieu: [524.4, 546.5],
      grossProject: [550.8, 573.0],
      grossAll: [577.2, 600.4],
      dedTax: [604.7, 627.2],
      dedFica: [631.6, 654.1],
      dedOther: [658.4, 685.1],
      dedTotal: [689.4, 708.5],
      net: [712.8, 747.7],
    },
    // 8 worker rows; each has an ST line and an OT line (measured from the
    // form's own ST/OT gutter labels).
    rows: [
      { st: 321.0, ot: 307.7 },
      { st: 292.7, ot: 279.2 },
      { st: 264.7, ot: 251.6 },
      { st: 236.8, ot: 222.7 },
      { st: 207.8, ot: 193.8 },
      { st: 178.9, ot: 165.0 },
      { st: 151.0, ot: 137.0 },
      { st: 123.1, ot: 109.2 },
    ],
    // Single-line-per-worker fields sit between the ST and OT baselines.
    midOffset: -6.5,
  },
};

export const page2 = {
  header: {
    projectName: { x: 37.5, y: 555 },
    projectNumber: { x: 244.5, y: 555 },
    payrollNumber: { x: 384, y: 555 },
    businessName: { x: 478.5, y: 555 },
    projectLocation: { x: 37.5, y: 523.5 },
    weekEndingDate: { x: 384, y: 523.5 },
    officialNameTitle: { x: 478.5, y: 523.5 },
  },
  // The seven certification statements each carry a checkbox in the left
  // gutter (glyph boxes located in the extraction).
  certifications: {
    payrollCorrect: { x: 40.5, y: 481.5 },
    recordsComplete: { x: 40.5, y: 450.5 },
    classificationsActual: { x: 40.5, y: 430.5 },
    apprenticesRegistered: { x: 40.5, y: 407 },
    fringesPaid: { x: 40.5, y: 322 },
    wagesFullyPaid: { x: 40.5, y: 134.5 },
  },
  apprenticeship: {
    rows: [
      { nameX: 60, y: 365.2, oaX: 385.5, saaX: 435, classX: 478.5 },
      { nameX: 60, y: 353.2, oaX: 385.5, saaX: 435, classX: 478.5 },
      { nameX: 60, y: 341.6, oaX: 385.5, saaX: 435, classX: 478.5 },
    ],
  },
  fringeGrid: {
    // Six fringe-benefit plan columns. Plan info is written once per column;
    // each worker row then carries the hourly credit under that plan.
    // dollarX = the column's printed "$"; credits print just right of it.
    planCols: [
      { x: 149.4, dollarX: 194.4, fundedX: 151.5, unfundedX: 196.5 },
      { x: 243.8, dollarX: 288.8, fundedX: 246, unfundedX: 291 },
      { x: 338.4, dollarX: 383.4, fundedX: 340.5, unfundedX: 385.5 },
      { x: 432.8, dollarX: 477.8, fundedX: 435, unfundedX: 480 },
      { x: 527.4, dollarX: 572.4, fundedX: 529.5, unfundedX: 574.5 },
      { x: 621.8, dollarX: 666.8, fundedX: 624, unfundedX: 669 },
    ],
    planNameY: 275.5,
    planTypeY: 263.5,
    planNoY: 251.5,
    fundedY: 244.5,
    workerNameX: 62,
    totalDollarX: 716.4,
    rowYs: [231, 219.5, 208.1, 196.6, 185, 173.6, 162.1, 150.6],
  },
  remarks: { x: 37.5, y: 99 },
  signature: {
    signatureX: 37.5,
    dateX: 384,
    emailX: 622.5,
    y: 60,
    // Phone digits drop onto the form's own "( __ __ __ ) __ __ __ – __ __ __ __"
    // guide (area/prefix/line underscore x positions, guide baseline y).
    phone: {
      y: 61.2,
      area: [485, 493.5, 502],
      prefix: [522.5, 531, 539.5],
      line: [561, 569.5, 578, 586.5],
    },
  },
};
