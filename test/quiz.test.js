// Quiz bank integrity for quiz-bank.js (Protocol Quiz).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'quiz-bank.js'), 'utf8') + ';this.QUIZ_BANK=QUIZ_BANK;', ctx);
const BANK = ctx.QUIZ_BANK;

test('all three levels have questions', () => {
  for (const b of ['emt', 'aemt', 'pm']) assert.ok(BANK[b] && BANK[b].length > 0, b);
});

test('every question is well formed', () => {
  for (const [b, qs] of Object.entries(BANK)) {
    const ids = qs.map(q => q.id);
    assert.strictEqual(new Set(ids).size, ids.length, `${b}: duplicate ids`);
    for (const q of qs) {
      const tag = `${b}:${q.id}`;
      assert.ok(q.q && q.cat && q.exp && q.exp.length > 20, `${tag} text/category/explanation`);
      assert.ok(Number.isInteger(q.ans) && q.ans >= 0 && q.ans < q.opts.length, `${tag} answer index`);
      if (q.type === 'tf') assert.strictEqual(JSON.stringify(q.opts), '["True","False"]', tag);
      else {
        assert.strictEqual(q.type, 'mc', tag);
        assert.ok(q.opts.every((o, i) => o.startsWith('ABCDEF'[i] + '. ')), `${tag} lettered options`);
      }
      // Options are shuffled on screen, so explanations must not cite letters
      assert.ok(!/\b(option|answer|choice) [A-F]\b|\([A-F]\)/i.test(q.exp), `${tag} cites an option letter`);
    }
  }
});

test('2026 review corrections hold', () => {
  const pain = BANK.pm.find(q => q.id === 28);
  assert.match(pain.opts[pain.ans], /non-opioid first/i, 'pain protocol is stepwise, non-opioid first');
  const ntg = BANK.aemt.find(q => q.id === 7);
  assert.ok(!/post-ROSC/i.test(ntg.exp), 'post-ROSC is not a listed NTG contraindication');
});
