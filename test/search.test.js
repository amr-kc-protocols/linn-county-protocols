// Search tests.
//
// Search previously matched raw protocol HTML, so "div" and "class"
// returned nearly every protocol while "narcan" and "chest pain"
// returned nothing. These pin the behaviour that replaced it.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./load.js');

const app = loadApp();
const { searchAll, stripHtml, SEARCH_ALIASES, FORMULARY } = app;

const titles = q => searchAll(q).map(r => r.e.title);
const top = q => (searchAll(q)[0] || {}).e;

// ── HTML must not be searchable ────────────────────────────────────
test('markup is stripped out of the index', () => {
  assert.equal(stripHtml('<div class="x">Give <b>2 mg</b></div>'), ' give 2 mg ');
  assert.ok(!stripHtml('<span>a</span>').includes('span'));
});

test('HTML tag and attribute names return nothing', () => {
  // Each of these used to match 40+ protocols. Only unambiguous markup
  // belongs here: "br" is a real prefix of Bradycardia, and "strong"
  // appears in "strong cardiac workup" — matching those is correct.
  for (const junk of ['div', 'span', '<div>', 'href', 'nbsp']) {
    assert.equal(searchAll(junk).length, 0, `"${junk}" should not match content`);
  }
});

// ── Finding the right thing ────────────────────────────────────────
test('a drug name leads with the drug, not a protocol mentioning it', () => {
  for (const drug of ['ketamine', 'naloxone', 'midazolam', 'vecuronium']) {
    const first = top(drug);
    assert.equal(first.kind, 'drug', `"${drug}" led with ${first.kind} "${first.title}"`);
    assert.ok(first.title.toLowerCase().includes(drug));
  }
});

test('brand names find the generic on the formulary', () => {
  const cases = [
    ['narcan', 'Naloxone'], ['versed', 'Midazolam'], ['zofran', 'Ondansetron'],
    ['benadryl', 'Diphenhydramine'], ['levophed', 'Norepinephrine'],
    ['adenocard', 'Adenosine'], ['zemuron', 'Rocuronium'], ['norcuron', 'Vecuronium'],
  ];
  for (const [brand, generic] of cases) {
    const first = top(brand);
    assert.ok(first, `"${brand}" found nothing`);
    assert.equal(first.title, generic, `"${brand}" led with "${first.title}"`);
  }
});

test('every alias target actually exists in the content', () => {
  // A typo in the alias map would silently send a search nowhere.
  const dead = [];
  for (const [alias, target] of Object.entries(SEARCH_ALIASES)) {
    if (!searchAll(target).length) dead.push(`${alias} -> ${target}`);
  }
  assert.deepEqual(dead, []);
});

test('RSI finds the MAI protocol, which is what Linn calls it', () => {
  const hits = titles('rsi').join(' | ').toLowerCase();
  assert.ok(hits.includes('mai'), `"rsi" returned: ${hits}`);
});

test('word order does not matter', () => {
  const a = titles('chest pain');
  const b = titles('pain chest');
  assert.ok(a.length > 0, '"chest pain" found nothing');
  assert.deepEqual(b, a);
});

test('presentation shorthand reaches the right protocol', () => {
  assert.ok(titles('heart attack').some(t => /ACS/i.test(t)));
  assert.ok(titles('cva').some(t => /stroke/i.test(t)));
});

test('all query terms must match — search is AND, not OR', () => {
  // "ketamine" alone matches several entries; adding a term that shares
  // none of them must narrow, never widen.
  const one = searchAll('ketamine').length;
  const two = searchAll('ketamine zzzznotaword').length;
  assert.equal(two, 0);
  assert.ok(one > 0);
});

test('search reaches every content type', () => {
  const kinds = new Set();
  for (const q of ['ketamine', 'stroke', 'intubation', 'triage', 'monitoring']) {
    searchAll(q).forEach(r => kinds.add(r.e.kind));
  }
  for (const k of ['drug', 'protocol']) {
    assert.ok(kinds.has(k), `search never returned a ${k}`);
  }
});

test('every formulary drug is findable by its own name', () => {
  const missing = [];
  for (const d of FORMULARY) {
    // Search on the first word of the name, which is the generic
    const key = d.name.split(/[\s/(]/)[0].toLowerCase();
    if (!searchAll(key).some(r => r.e.kind === 'drug' && r.e.title === d.name)) {
      missing.push(d.name);
    }
  }
  assert.deepEqual(missing, []);
});

test('an empty query returns nothing rather than everything', () => {
  assert.equal(searchAll('').length, 0);
  assert.equal(searchAll('   ').length, 0);
});
