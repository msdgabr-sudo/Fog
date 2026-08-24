const assert = require('assert');
const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const digitalCss = read('css/digital-compass/digital-compass.css');
const bootstrap = read('js/presentation/bootstrap.js');
const modeView = read('js/compass-mode-view.js');
const serviceWorker = read('service-worker.js');

assert(
  digitalCss.includes('--qd-line: rgba(116, 185, 232, .40);'),
  'digital controls must use the qappan reference edge color'
);
assert(
  digitalCss.includes('rgba(185, 229, 255, .45)'),
  'digital controls must use the qappan reference top highlight'
);
assert(
  digitalCss.includes('border-color: rgba(116, 185, 232, .58);'),
  'digital active controls must use the qappan reference pressed edge'
);

const dashboardStyle = bootstrap.indexOf("loadStyle('css/compass-astro-dashboard.css");
const goldStyle = bootstrap.indexOf("loadStyle('css/compass-astro-gold-borders.css");
assert(dashboardStyle >= 0, 'astronomical dashboard stylesheet must remain loaded');
assert(goldStyle > dashboardStyle, 'qappan astronomical border layer must load after the dashboard base');
assert(
  serviceWorker.includes('./css/compass-astro-gold-borders.css'),
  'astronomical button/card border layer must remain available offline'
);

assert(
  modeView.includes("button.style.boxShadow='0 7px 18px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,226,150,.14)';"),
  'astronomical Home button must retain the qappan reference depth'
);
assert(
  modeView.includes("button.style.cursor='pointer';"),
  'astronomical Home button must retain its interactive affordance'
);

console.log('compass button parity tests passed');
