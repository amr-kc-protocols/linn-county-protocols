// Dose math tests.
//
// This app computes medication doses from patient weight, and two dose
// bugs have already shipped and been fixed by hand:
//
//   3665df6  Never render a nonzero dose as zero
//   274f664  Cap pediatric weight-based doses at the adult dose
//
// Both are pinned below, alongside property checks that run every rule
// in PT_CALC across a realistic weight range. Run with `npm test`.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./load.js');

const app = loadApp();
const { fmt, pk, pkr, PT_CALC, BROSELOW, SECTIONS, maiDoses } = app;

// Neonate through bariatric adult, including every Broselow anchor.
const WEIGHTS = [3, 4, 5, 6.5, 8.5, 10.5, 13, 16.5, 21, 26.5, 33, 40, 50, 70, 100, 150, 300];

// First number in a rendered dose ("1,000 mg" -> 1000, "2.5–5 mg" -> 2.5).
function firstNumber(s) {
  const m = String(s).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

// ── fmt: decimal formatting ────────────────────────────────────────
test('fmt trims trailing zeros', () => {
  assert.equal(fmt(2.0), '2');
  assert.equal(fmt(2.5), '2.5');
  assert.equal(fmt(1000, 0), '1000');
});

test('fmt never renders a nonzero dose as zero (regression: 3665df6)', () => {
  // A dose that rounds to 0 at the requested precision must gain
  // decimals instead of displaying as "0" — "0 mg" reads as "give none".
  assert.equal(fmt(0.04, 1), '0.04');
  assert.equal(fmt(0.004, 1), '0.004');
  // Escalates only as far as it needs to: 0.06 is visible at 1 decimal.
  assert.equal(fmt(0.06, 0), '0.1');
  for (const v of [0.001, 0.01, 0.04, 0.09, 0.5]) {
    assert.notEqual(fmt(v, 1), '0', `fmt(${v}) must not render as "0"`);
  }
});

test('fmt renders a true zero as zero', () => {
  assert.equal(fmt(0), '0');
});

// ── pk: per-kg dosing with a ceiling ───────────────────────────────
test('pk multiplies weight by the per-kg rate', () => {
  assert.equal(pk(20, 0.1, 6, 'mg'), '2 mg');
  assert.equal(pk(10, 15, 1000, 'mg', 0), '150 mg');
});

test('pk caps at the max and flags it (regression: 274f664)', () => {
  // Above the ceiling a child must not out-dose an adult, and the
  // display has to say so rather than silently clamping.
  assert.equal(pk(90, 0.1, 6, 'mg'), '6 mg (max)');
  assert.equal(pk(100, 15, 1000, 'mg', 0), '1000 mg (max)');
});

test('pk omits the max flag below the ceiling', () => {
  assert.ok(!pk(20, 0.1, 6, 'mg').includes('(max)'));
});

test('pk with no ceiling never flags a max', () => {
  assert.equal(pk(50, 0.5, null, 'g'), '25 g');
});

// ── pkr: per-kg ranges with a ceiling ──────────────────────────────
test('pkr renders a range', () => {
  assert.equal(pkr(10, 0.1, 0.2, null, 'mg'), '1–2 mg');
});

test('pkr caps the top of the range', () => {
  const out = pkr(100, 0.1, 0.2, 12, 'mg');
  assert.ok(out.includes('(max)'), `expected a max flag, got "${out}"`);
  assert.ok(out.includes('12'), `expected the ceiling, got "${out}"`);
});

test('pkr collapses to a single value when both ends are capped', () => {
  assert.equal(pkr(500, 0.1, 0.2, 12, 'mg'), '12 mg (max)');
});

// ── MAI calculator ─────────────────────────────────────────────────
test('maiDoses computes the induction and paralytic doses', () => {
  const d = Object.fromEntries(maiDoses(80).map(x => [x.name.split(' (')[0], x]));
  assert.equal(d.Ketamine.lo, 80);          // 1 mg/kg
  assert.equal(d.Ketamine.hi, 120);         // 1.5 mg/kg
  assert.ok(Math.abs(d.Vecuronium.lo - 8) < 1e-9);  // 0.1 mg/kg
  assert.equal(d.Rocuronium.lo, 80);        // 1 mg/kg
});

test('maiDoses leaves fixed doses fixed regardless of weight', () => {
  for (const kg of [10, 80, 200]) {
    const d = Object.fromEntries(maiDoses(kg).map(x => [x.name.split(' (')[0], x]));
    assert.equal(d.Midazolam.lo, 2.5);
    assert.equal(d.Midazolam.hi, 5);
    assert.equal(d.Lidocaine.lo, 40);
  }
});

test('maiDoses caps weight at 300 kg', () => {
  assert.deepEqual(maiDoses(500), maiDoses(300));
});

// ── Every rule in the formulary ────────────────────────────────────
test('every dose rule renders a usable string at every weight', () => {
  const problems = [];
  for (const [drug, rules] of Object.entries(PT_CALC)) {
    rules.forEach((rule, i) => {
      for (const kg of WEIGHTS) {
        let out;
        try {
          out = rule.f(kg);
        } catch (err) {
          problems.push(`${drug}#${i} @${kg}kg threw: ${err.message}`);
          continue;
        }
        if (typeof out !== 'string' || !out.trim()) {
          problems.push(`${drug}#${i} @${kg}kg returned ${JSON.stringify(out)}`);
        } else if (/NaN|undefined|Infinity/.test(out)) {
          problems.push(`${drug}#${i} @${kg}kg -> "${out}"`);
        }
      }
    });
  }
  assert.deepEqual(problems, []);
});

test('no rule ever renders a zero dose', () => {
  // "0 mg" on a dose card reads as "give nothing" — it is always a bug.
  const problems = [];
  for (const [drug, rules] of Object.entries(PT_CALC)) {
    rules.forEach((rule, i) => {
      for (const kg of WEIGHTS) {
        const out = rule.f(kg);
        if (/(^|\s)0(\.0+)?\s*(mg|mcg|g|mL)\b/.test(out)) {
          problems.push(`${drug}#${i} @${kg}kg -> "${out}"`);
        }
      }
    });
  }
  assert.deepEqual(problems, []);
});

test('doses never decrease as patient weight increases', () => {
  const problems = [];
  for (const [drug, rules] of Object.entries(PT_CALC)) {
    rules.forEach((rule, i) => {
      let prev = null, prevKg = null;
      for (const kg of WEIGHTS) {
        const v = firstNumber(rule.f(kg));
        if (v === null) continue;
        if (prev !== null && v < prev - 1e-9) {
          problems.push(`${drug}#${i}: ${prevKg}kg -> "${rule.f(prevKg)}" but ${kg}kg -> "${rule.f(kg)}"`);
        }
        prev = v; prevKg = kg;
      }
    });
  }
  assert.deepEqual(problems, []);
});

test('every capped rule actually stops at its ceiling', () => {
  // Whatever the ceiling is, 300 kg must not exceed 150 kg.
  const problems = [];
  for (const [drug, rules] of Object.entries(PT_CALC)) {
    rules.forEach((rule, i) => {
      const big = rule.f(300);
      if (!/\(max\)/.test(big)) return;      // uncapped rules are fine
      const half = firstNumber(rule.f(150));
      const full = firstNumber(big);
      if (half !== null && full !== null && full > half + 1e-9) {
        problems.push(`${drug}#${i}: 150kg -> "${rule.f(150)}", 300kg -> "${big}"`);
      }
    });
  }
  assert.deepEqual(problems, []);
});

test('every rule is tagged with the population it applies to', () => {
  for (const [drug, rules] of Object.entries(PT_CALC)) {
    rules.forEach((rule, i) => {
      assert.ok(['all', 'adult', 'peds'].includes(rule.who),
        `${drug}#${i} has who="${rule.who}"`);
      assert.ok(rule.ind && rule.ind.trim(), `${drug}#${i} has no indication`);
      assert.equal(typeof rule.f, 'function', `${drug}#${i} has no dose function`);
    });
  }
});

// ── Broselow tape ──────────────────────────────────────────────────
test('Broselow zones are ordered and well formed', () => {
  assert.ok(BROSELOW.length > 0);
  BROSELOW.forEach((zone, i) => {
    assert.ok(zone.c && zone.c.trim(), `zone ${i} has no colour name`);
    assert.ok(zone.kg > 0, `zone ${zone.c} has a non-positive weight`);
    assert.match(zone.hex, /^#[0-9A-Fa-f]{6}$/, `zone ${zone.c} has a bad hex`);
    if (i > 0) {
      assert.ok(zone.kg > BROSELOW[i - 1].kg,
        `zone ${zone.c} (${zone.kg}kg) is not heavier than ${BROSELOW[i - 1].c}`);
    }
  });
});

test('each Broselow weight sits inside its own printed range', () => {
  for (const zone of BROSELOW) {
    const [lo, hi] = zone.range.replace(/\s*kg\s*$/, '').split(/[–-]/).map(Number);
    assert.ok(zone.kg >= lo && zone.kg <= hi,
      `${zone.c}: ${zone.kg}kg is outside its stated range ${zone.range}`);
  }
});

// ── Protocol content ───────────────────────────────────────────────
test('every protocol has the fields the UI renders', () => {
  for (const section of SECTIONS.protocols) {
    assert.ok(section.section && section.section.trim(), 'a section has no name');
    for (const item of section.items) {
      assert.ok(item.id, `${section.section}: an item has no id`);
      assert.ok(item.title && item.title.trim(), `${item.id} has no title`);
      assert.ok(item.scope && item.scope.trim(), `${item.id} has no scope`);
      assert.ok(item.body && item.body.trim(), `${item.id} has no body`);
    }
  }
});

test('protocol ids are unique', () => {
  const seen = new Map();
  const dupes = [];
  for (const section of SECTIONS.protocols) {
    for (const item of section.items) {
      if (seen.has(item.id)) dupes.push(`${item.id}: "${seen.get(item.id)}" and "${item.title}"`);
      else seen.set(item.id, item.title);
    }
  }
  assert.deepEqual(dupes, []);
});

test('every scope string maps to a known badge class', () => {
  const known = new Set(['scope-all', 'scope-emt', 'scope-aemt', 'scope-pm', 'scope-multi']);
  for (const section of SECTIONS.protocols) {
    for (const item of section.items) {
      assert.ok(known.has(app.getScopeClass(item.scope)),
        `${item.id} scope "${item.scope}" mapped to an unknown class`);
    }
  }
});
