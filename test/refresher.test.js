// The refresher banner is time-boxed: it must count down, track the next
// class night, and disappear after the last session so a dead sign-up link
// never sits on the home screen of an offline app.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./load');
const { refresherCard } = loadApp();
const at = (y, m, d) => new Date(y, m - 1, d, 12);

test('before the course: countdown to first session', () => {
  const h = refresherCard(at(2026, 10, 5));
  assert.match(h, /Starts Monday, October 12 &middot; 7 days away/);
  assert.match(h, /signupgenius\.com\/go\/10C0D4AABAB2CA6F4C52-65569881-rocky/);
});
test('class night says Tonight', () => {
  assert.match(refresherCard(at(2026, 10, 19)), /Tonight/);
});
test('off night points to the next session', () => {
  assert.match(refresherCard(at(2026, 10, 18)), /Next session Monday, October 19/);
});
test('still shows on the last session', () => {
  assert.match(refresherCard(at(2026, 11, 18)), /Tonight/);
});
test('gone the day after the last session', () => {
  assert.strictEqual(refresherCard(at(2026, 11, 19)), '');
});
