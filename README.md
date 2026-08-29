# wh347-pdf

Fill the official U.S. Department of Labor **Form WH-347** (Davis-Bacon and
Related Acts weekly certified payroll, **Rev. January 2025**, OMB 1235-0008)
programmatically, in Node or the browser, by overlaying data onto the
untouched official PDF.

Built and maintained by [WeeklyCertified](https://weeklycertified.com),
certified payroll software for small construction subcontractors. This
library is the exact fill engine that product ships.

## Why this exists

Most WH-347 tooling still targets the pre-2025 form layout. The January 2025
revision reorganized the columns (split name fields, separate weekly-total
fringe columns 6B/6C, a page-2 fringe-plan grid and apprenticeship table),
and DOL publishes no fillable AcroForm version. This library:

- draws onto the **untouched official PDF** (no layout recreation, no
  altered wording, no watermarks on the form itself);
- uses **measured coordinates**: extracted from the form's printed labels
  and vector rules, not eyeballed (`scripts/` contains the extractors, so a
  future DOL revision can be re-measured instead of guessed);
- does **integer-cent pay math**: Davis-Bacon overtime at 1.5x the basic
  rate with derived half-cent rates rounding up (never below the legal
  minimum), fringe owed on every hour worked, gross accumulated exactly and
  rounded once;
- **refuses to fabricate**: missing worker type, unstated prime/sub role,
  unspecified plan funding, page-1 fringe credits that don't reconcile with
  the page-2 grid, unidentified "other" deductions, and garbage numeric
  input all throw instead of silently printing something on a federal
  certification;
- embeds fonts (pass TTF bytes) so every PDF viewer renders identical
  widths, with numeric cells right-aligned inside their measured rules.

## Install

```sh
npm i wh347-pdf pdf-lib @pdf-lib/fontkit
```

## Use

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { fillWh347 } from 'wh347-pdf';

const official = readFileSync('node_modules/wh347-pdf/data/wh347-official.pdf');
const fonts = { regular: readFileSync('LiberationSans-Regular.ttf'),
                bold: readFileSync('LiberationSans-Bold.ttf') }; // optional but recommended

const { bytes, results } = await fillWh347(official, {
  role: 'sub',
  projectName: 'Riverside Elementary HVAC Upgrade',
  projectNumber: 'GS-04P-26-EX-C-0042',
  payrollNumber: '3',
  weekEndingDate: '2026-08-22',
  businessName: 'Test Mechanical LLC',
  businessAddress: '100 Sample Rd, Rome, GA 30161',
  projectLocation: 'Talbot County, GA',
  wageDeterminationNumber: 'GA20260100 Mod 2',
  workers: [{
    lastName: 'Alvarez', firstName: 'Marcus', middleInitial: 'D',
    idNumber: 'XXX-XX-1234', type: 'J', classification: 'Electrician',
    stHours: [0, 8, 8, 8, 8, 8, 0], otHours: [0, 0, 2, 0, 1, 0, 0],
    rateSt: 38.65, fringeCredit: 8.5, cashInLieu: 4.25,
    deductions: { tax: 182.4, fica: 137.51, other: 45 },
  }],
  compliance: {
    officialName: 'Casey Sample', officialTitle: 'Owner',
    certify: { payrollCorrect: true, recordsComplete: true,
               classificationsActual: true, wagesFullyPaid: true },
    fringePlans: [{ name: 'ABC Health', type: 'Health', planNo: 'H-4411',
                    funded: true, creditsByWorker: [8.5] }],
    remarks: 'Other deduction is a court-ordered garnishment.',
    date: '8/25/2026', phone: '(706) 555-0142', email: 'payroll@example.com',
  },
}, fonts);
writeFileSync('payroll.pdf', bytes);
```

`results` returns the computed figures per worker (cents). An optional
receipt page can be appended behind the form with `appendCoverSheet` from
`wh347-pdf/cover`, and `wh347-pdf/wd-parse` parses SAM.gov General Decision
documents into structured classification/rate/fringe tables.

## Semantics worth knowing

Verified against DOL's annotated guide for the Jan-2025 revision:

- Page-1 **6B/6C hold weekly totals** (hours x hourly figure); the hourly
  credit belongs only in page 2's fringe grid, and the library enforces that
  the two reconcile.
- Column 7A gross includes cash paid in lieu of fringes; 6A shows the basic
  rate without it; net = all-work gross minus all-work deductions.
- Sheets hold 8 workers, 6 fringe plans, 3 apprenticeship programs; more
  throws with a continuation/addendum message rather than truncating.
- Certification checkboxes are never auto-checked, and the signature line is
  always left empty. The contractor certifies; software must not.

## What this is not

This library formats and computes. It does not decide labor classifications,
look up wage rates, judge fringe-plan bona fides, or provide legal advice,
and it is not affiliated with the U.S. Department of Labor. The person
signing the Statement of Compliance certifies the payroll.

## Test

```sh
npm i && npm test   # 26 gates: pay math + fill validation
```

MIT (c) Forge Dev Studio LLC. The bundled WH-347 PDF is a U.S. government
work in the public domain.
