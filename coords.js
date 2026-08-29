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
    xCenters: [348.5, 361.7, 374.0, 386.3, 398.7, 411.0, 423.8],
    dayY: 383.6,
    dateY: 377.0,
  },
  table: {
    // Column x positions (left edge of writable cell area).
    col: {
      entryNo: 50, // (1A)
      lastName: 68, // (1B)
      firstName: 120, // (1C)
      middleInitial: 176, // (1D)
      idNumber: 200, // (1E)
      type: 240, // (2) J / RA
      classification: 258, // (3)
    },
    // Money/hours cells measured from the form's own vertical rules in the
    // worker-row band (NOT from header label positions, which are centered
    // and misled an earlier version). [leftRule, rightRule] in PDF points.
    moneyCells: {
      totalHours: [430.4, 457.2],
      rate: [469.6, 498.1],
      fringeCredit: [498.1, 524.4],
      cashInLieu: [524.4, 550.8],
      grossProject: [550.8, 577.2],
      grossAll: [577.2, 604.7],
      dedTax: [604.7, 631.6],
      dedFica: [631.6, 658.4],
      dedOther: [658.4, 689.4],
      dedTotal: [689.4, 712.8],
      net: [712.8, 752.0],
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
