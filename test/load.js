// Loads the app's browser scripts into a Node sandbox so the dose math
// can be tested directly. data.js and app.js are plain <script> files —
// no modules, no exports — so they're evaluated in a vm context with a
// stub DOM standing in for the browser globals app.js touches at load.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function stubElement() {
  const el = {
    value: '', innerHTML: '', textContent: '', style: {},
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    dataset: {},
    addEventListener(){}, removeEventListener(){}, appendChild(){},
    scrollIntoView(){}, focus(){}, click(){},
    querySelector(){ return stubElement(); },
    querySelectorAll(){ return []; },
    closest(){ return null; },
    getAttribute(){ return null; }, setAttribute(){},
  };
  return el;
}

function makeSandbox() {
  const doc = {
    getElementById(){ return stubElement(); },
    querySelector(){ return stubElement(); },
    querySelectorAll(){ return []; },
    createElement(){ return stubElement(); },
    addEventListener(){},
    body: stubElement(),
  };
  const storage = (() => {
    const map = new Map();
    return {
      getItem: k => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: k => map.delete(k),
    };
  })();
  const sandbox = {
    document: doc,
    localStorage: storage,
    history: { state: null, pushState(){}, back(){} },
    console,
    setTimeout, clearTimeout,
    navigator: { serviceWorker: undefined },
    addEventListener(){}, removeEventListener(){}, scrollTo(){},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

// Names the tests need. Top-level `const` in a vm script lands in the
// global *lexical* scope, not on the global object, so it can't be read
// from outside — this final script copies them out by name.
const EXPORTS = [
  'fmt', 'pk', 'pkr', 'PT_CALC', 'BROSELOW', 'SECTIONS', 'OPS_DATA',
  'maiDoses', 'getScopeClass',
];

// Evaluate data.js and app.js in one shared context, the way the browser
// does — app.js depends on globals that data.js defines.
function loadApp() {
  const sandbox = makeSandbox();
  const context = vm.createContext(sandbox);
  for (const file of ['data.js', 'app.js']) {
    const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(code, context, { filename: file });
  }
  const collect = `globalThis.__app = { ${EXPORTS.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };`;
  vm.runInContext(collect, context, { filename: 'collect-exports' });
  const app = context.__app;
  const missing = EXPORTS.filter(n => app[n] === undefined);
  if (missing.length) {
    throw new Error(`app globals not found (renamed or removed?): ${missing.join(', ')}`);
  }
  return app;
}

module.exports = { loadApp };
