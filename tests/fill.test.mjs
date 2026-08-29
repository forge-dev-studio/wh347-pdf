// Fill-engine validation gate: the library must refuse to fabricate anything
// on a certified document. Run: node tests/fill.test.mjs
import { readFileSync } from 'node:fs';
import { fillWh347 } from '../index.js';

const official = readFileSync(new URL('../data/wh347-official.pdf', import.meta.url));
let failed = 0;
const a = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); if (!cond) failed++; };
const rejects = async (fn) => { try { await fn(); return false; } catch { return true; } };

const base = () => ({
  role: 'sub', projectName: 'T', businessName: 'B', weekEndingDate: '2026-08-22',
  workers: [{ lastName: 'A', firstName: 'B', type: 'J', classification: 'Laborer', rateSt: 20, stHours: [8], otHours: [], deductions: {} }],
  compliance: { certify: {} },
});

a('valid payroll fills', !(await rejects(async () => fillWh347(official, base()))));

let p = base(); delete p.role;
a('missing role rejected', await rejects(() => fillWh347(official, p)));

p = base(); p.workers[0].type = 'X';
a('bad worker type rejected', await rejects(() => fillWh347(official, p)));

p = base(); delete p.workers[0].type;
a('missing worker type rejected', await rejects(() => fillWh347(official, p)));

p = base(); p.workers[0].fringeCredit = 5;
a('6B credit without page-2 plans rejected', await rejects(() => fillWh347(official, p)));

p = base(); p.workers[0].fringeCredit = 5;
p.compliance.fringePlans = [{ name: 'Plan', type: 'Health', planNo: '1', funded: true, creditsByWorker: [5] }];
a('6B credit matching plan grid accepted', !(await rejects(() => fillWh347(official, p))));

p = base(); p.workers[0].fringeCredit = 5;
p.compliance.fringePlans = [{ name: 'Plan', type: 'Health', planNo: '1', funded: true, creditsByWorker: [3] }];
a('6B/grid mismatch rejected', await rejects(() => fillWh347(official, p)));

p = base(); p.compliance.fringePlans = [{ name: 'Plan', creditsByWorker: [] }];
a('plan without funded flag rejected', await rejects(() => fillWh347(official, p)));

p = base(); p.compliance.apprenticePrograms = [{ name: 'Prog', registeredWith: '??' }];
a('program without OA/SAA rejected', await rejects(() => fillWh347(official, p)));

p = base(); p.workers[0].deductions = { other: 10 };
a('other deduction without remarks rejected', await rejects(() => fillWh347(official, p)));

p = base(); p.workers[0].deductions = { other: 10 }; p.compliance.remarks = 'Child support garnishment.';
a('other deduction with remarks accepted', !(await rejects(() => fillWh347(official, p))));

p = base(); p.workers[0].stHours = [8, 8, 8, 8, 8, 8, 8, 8];
a('8-day hours array rejected', await rejects(() => fillWh347(official, p)));

p = base(); p.compliance.fringePlans = Array.from({ length: 7 }, (_, i) => ({ name: `P${i}`, funded: true, creditsByWorker: [] }));
a('7 fringe plans rejected (addendum required)', await rejects(() => fillWh347(official, p)));

if (failed) { console.error(`${failed} FAILURES`); process.exit(1); }
console.log('all fill-validation gates pass');
