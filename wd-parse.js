// Browser port of the wage-determination text parser (see sync/wd-source.mjs
// for the canonical version and the layout facts it was verified against:
// 21/21 rate lines on a GA building WD, 50/50 on a TX highway WD). Parsing
// failures surface as gaps, never as invented numbers; the raw text is always
// available to show the user.

export function parseWdText(text) {
  if (!text) return { ok: false, reason: 'empty document' };
  const lines = text.split(/\r?\n/);
  const out = {
    ok: true,
    generalDecisionNumber: null,
    decisionDate: null,
    supersededNumber: null,
    state: null,
    constructionTypes: null,
    counties: null,
    modifications: [],
    rates: [],
  };
  const rateRe = /^(.*?)\.+\s*\$\s*([0-9]+(?:\.[0-9]+)?)(?:\s+([0-9]+(?:\.[0-9]+)?))?\s*$/;
  const groupRe = /^\s*\*?\s*([A-Z]{3,6}\d{4}-\d{3})\s+(\d{2}\/\d{2}\/\d{4})\s*$/;
  let currentGroup = null;
  let buffer = [];
  let inCounties = false;

  const flushEntry = (preDot, rate, fringe) => {
    let classification = preDot.trim();
    let note = null;
    if (buffer.length) {
      const first = buffer[0];
      const wide = first.split(/\s{3,}/);
      if (wide.length > 1) {
        classification = wide[0].trim();
        note = [wide.slice(1).join(' '), ...buffer.slice(1), preDot].join(' ').replace(/\s+/g, ' ').trim();
      } else {
        classification = [...buffer, preDot].join(' ').replace(/\s+/g, ' ').trim();
      }
    }
    out.rates.push({
      classification,
      rate: Number(rate),
      fringe: fringe != null ? Number(fringe) : null,
      group: currentGroup,
      ...(note ? { note } : {}),
    });
    buffer = [];
  };

  for (const line of lines) {
    const t = line.trim().replace(/^"+/, '');
    let m;
    if (!t) { inCounties = false; continue; }
    if (inCounties) { out.counties = `${out.counties ?? ''} ${t}`.trim(); continue; }
    if ((m = t.match(/^General Decision Number:\s*(\S+)\s*(\S+)?/))) {
      out.generalDecisionNumber = m[1];
      out.decisionDate = m[2] ?? null;
    } else if ((m = t.match(/^Superseded General Decision Number:\s*(\S+)/))) {
      out.supersededNumber = m[1];
    } else if ((m = t.match(/^State:\s*(.+)$/))) {
      out.state = m[1].trim();
    } else if ((m = t.match(/^Construction Types?:\s*(.+)$/))) {
      out.constructionTypes = m[1].trim();
    } else if ((m = t.match(/^Count(?:y|ies):\s*(.*)$/))) {
      out.counties = m[1].trim();
      inCounties = true;
    } else if ((m = t.match(/^(\d+)\s+(\d{2}\/\d{2}\/\d{4})$/))) {
      out.modifications.push({ number: Number(m[1]), publicationDate: m[2] });
    } else if ((m = line.match(groupRe))) {
      currentGroup = { id: m[1], date: m[2] };
      buffer = [];
    } else if (/^-{10,}$/.test(t) || /^Rates\s+Fringes$/i.test(t)) {
      buffer = [];
    } else if ((m = line.match(rateRe))) {
      flushEntry(m[1], m[2], m[3]);
    } else if (currentGroup && !t.includes('$') && t.length < 120) {
      buffer.push(t);
      if (buffer.length > 12) buffer = [];
    }
  }
  if (!out.rates.length) {
    out.ok = false;
    out.reason = 'no rate lines parsed';
  }
  return out;
}
