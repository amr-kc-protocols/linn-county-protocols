// The Kansas license renewal guide: the hours table must add up, the page
// must be linked from Home and cached for offline, and outside links must
// be https.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const page = read('kansas-relicensure.html');

function hoursRows() {
  const start = page.indexOf('<h2 id="hours">');
  const table = page.slice(page.indexOf('<table', start), page.indexOf('</table>', start));
  return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].slice(1).map(m =>
    [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1].replace(/<[^>]+>/g, '').trim()));
}

test('hours table adds up to the Kansas totals', () => {
  const rows = hoursRows();
  const num = r => r.slice(1).map(Number);
  const topics = rows.slice(0, 6).map(num);
  const core = num(rows.find(r => /core total/i.test(r[0])));
  const flex = num(rows.find(r => /^flex/i.test(r[0])));
  const total = num(rows.find(r => /^total/i.test(r[0])));
  for (let i = 0; i < 3; i++) {
    assert.strictEqual(topics.reduce((a, r) => a + r[i], 0), core[i]);
    assert.strictEqual(core[i] + flex[i], total[i]);
  }
  assert.deepStrictEqual(total, [28, 44, 60]);
});

test('outside links are https and the portal is linked', () => {
  const hrefs = [...page.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  const ext = hrefs.filter(h => /^[a-z]+:/i.test(h) && !h.startsWith('tel:'));
  assert.ok(ext.length > 0);
  ext.forEach(h => assert.match(h, /^https:\/\//));
  assert.ok(hrefs.some(h => h.includes('kemsis.org/lms/public/portal')));
  const ids = new Set([...page.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  hrefs.filter(h => h.startsWith('#')).forEach(h => assert.ok(ids.has(h.slice(1)), h));
});

test('linked from Home and precached', () => {
  assert.match(read('app.js'), /href="kansas-relicensure\.html"/);
  assert.match(read('sw.js'), /'\.\/kansas-relicensure\.html'/);
});
