const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const digitalCss = read('css/digital-compass/digital-compass.css');
const bootstrap = read('js/presentation/bootstrap.js');
const modeView = read('js/compass-mode-view.js');
const serviceWorker = read('service-worker.js');

assert(
  digitalCss.includes('--qd-line: rgba(218, 174, 72, .86);'),
  'digital controls must use the qappan reference gold edge color'
);
assert(
  digitalCss.includes('rgba(185, 229, 255, .45)'),
  'digital controls must use the qappan reference silver-blue top highlight'
);
assert(digitalCss.includes('@media (max-height: 540px)'), 'qappan short-screen breakpoint must remain present');
assert(
  digitalCss.includes('border-color: rgba(238, 199, 98, .96);'),
  'digital active controls must use the qappan reference pressed gold edge'
);

const dashboardStyle = bootstrap.indexOf("loadStyle('css/compass-astro-dashboard.css");
const goldStyle = bootstrap.indexOf("loadStyle('css/compass-astro-gold-borders.css");
assert(dashboardStyle >= 0, 'astronomical dashboard stylesheet must remain loaded');
assert(goldStyle < 0, 'astronomical dashboard must retain its reference blue edges');
assert(
  !serviceWorker.includes('./css/compass-astro-gold-borders.css'),
  'obsolete astronomical gold override must not be precached'
);

assert(modeView.includes("actionWrapper('showManualCal')"), 'manual calibration wrapper must be mode-controlled');
assert(modeView.includes("actionWrapper('tryBrowserGPS')"), 'GNSS wrapper must be mode-controlled');
assert(modeView.includes("var visible=currentMode==='digital';"), 'legacy digital actions must be hidden in astronomical mode');
assert(modeView.includes("currentMode==='digital'&&pageIsActive()"), 'digital controller must run only on the active compass route');

const manualWrapper = { style: {}, setAttribute(name, value) { this[name] = value; } };
const gnssWrapper = { style: {}, setAttribute(name, value) { this[name] = value; } };
const pageClasses = new Set(['active']);
const page = {
  classList: {
    contains(name) { return pageClasses.has(name); },
    toggle(name, enabled) { enabled ? pageClasses.add(name) : pageClasses.delete(name); }
  }
};
const nodes = { 'page-compass': page };
const document = {
  readyState: 'complete',
  body: { appendChild(node) { nodes[node.id] = node; } },
  documentElement: { appendChild(node) { nodes[node.id] = node; } },
  getElementById(id) { return nodes[id] || null; },
  querySelector(selector) {
    if (selector.includes('showManualCal')) return { parentElement: manualWrapper };
    if (selector.includes('tryBrowserGPS')) return { parentElement: gnssWrapper };
    return null;
  },
  createElement() {
    return {
      style: {},
      setAttribute() {},
      addEventListener() {}
    };
  }
};
const context = {
  document,
  sessionStorage: { getItem() { return null; }, setItem() {} },
  addEventListener() {}
};
vm.runInNewContext(modeView, context);
context.QiblaCompassViewMode.set('astro');
assert.strictEqual(manualWrapper.style.display, 'none', 'manual calibration must disappear in astronomical mode');
assert.strictEqual(gnssWrapper.style.display, 'none', 'GNSS action must disappear in astronomical mode');
assert.strictEqual(manualWrapper['aria-hidden'], 'true', 'hidden manual calibration must leave the accessibility tree');
assert.strictEqual(gnssWrapper['aria-hidden'], 'true', 'hidden GNSS action must leave the accessibility tree');
context.QiblaCompassViewMode.set('digital');
assert.strictEqual(manualWrapper.style.display, '', 'manual calibration must return in digital mode');
assert.strictEqual(gnssWrapper.style.display, '', 'GNSS action must return in digital mode');

assert(
  modeView.includes("button.style.boxShadow='0 7px 18px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,226,150,.14)';"),
  'astronomical Home button must retain the qappan reference depth'
);
assert(
  modeView.includes("button.style.cursor='pointer';"),
  'astronomical Home button must retain its interactive affordance'
);

console.log('compass button parity tests passed');
