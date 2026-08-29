// Pay-math gate. Run: node tests/compute.test.mjs  (exits 1 on any failure)
// These encode the adversarial-review fixes; do not weaken them.
import { computeWorker } from '../compute.js';

let failed = 0;
const a = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); if (!cond) failed++; };
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

// Derived OT rate with a half-cent rounds UP: never below 1.5x basic.
let r = computeWorker({ rateSt: 38.63, stHours: [], otHours: [2], deductions: {} });
a('OT ceil 38.63 -> 57.95', r.rateOt === 5795);
a('OT pay 2h = 115.90', r.grossProject === 11590);
r = computeWorker({ rateSt: 38.65, stHours: [], otHours: [2], deductions: {} });
a('OT 38.65 -> 57.98', r.rateOt === 5798 && r.grossProject === 11596);

// Decimal-string ties parse half-up (binary float would round 1.005 down).
r = computeWorker({ rateSt: '1.005', stHours: [1], otHours: [], deductions: {} });
a('string 1.005 -> 101 cents', r.rateSt === 101);

// Gross accumulates exactly and rounds once, not per component.
r = computeWorker({ rateSt: 0.5, cashInLieu: 0.5, stHours: [0.01], otHours: [], deductions: {} });
a('sub-cent gross rounds once', r.grossProject === 1);

// Regression: the original verified sample worker.
r = computeWorker({
  rateSt: 38.65, fringeCredit: 8.5, cashInLieu: 4.25,
  stHours: [0, 8, 8, 8, 8, 8, 0], otHours: [0, 0, 2, 0, 1, 0, 0],
  deductions: { tax: 182.4, fica: 137.51, other: 45 },
});
a('regression gross 1902.69', r.grossProject === 190269);
a('regression net 1537.78', r.net === 153778);
// Page-1 6B/6C are WEEKLY TOTALS (43h x hourly), per DOL's annotated guide.
a('6B weekly total 365.50', r.fringeCreditTotal === 36550);
a('6C weekly total 182.75', r.cashInLieuTotal === 18275);

// Garbage must throw, never silently compute $0.
a('garbage rate throws', throws(() => computeWorker({ rateSt: 'abc', stHours: [8], otHours: [] })));
a('string stHours throws', throws(() => computeWorker({ rateSt: 20, stHours: '7.50', otHours: [] })));
a('Infinity throws', throws(() => computeWorker({ rateSt: Infinity, stHours: [8], otHours: [] })));
a('>24h day throws', throws(() => computeWorker({ rateSt: 20, stHours: [25], otHours: [] })));

// Optional-absent means zero, not error.
r = computeWorker({ rateSt: 20, stHours: [8], otHours: [], deductions: {} });
a('absent optionals are zero', r.cashInLieu === 0 && r.fringeCredit === 0 && r.net === r.grossProject);

if (failed) { console.error(`${failed} FAILURES`); process.exit(1); }
console.log('all pay-math gates pass');
