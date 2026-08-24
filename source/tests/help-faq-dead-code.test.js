'use strict';

const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html', 'utf8');

assert(index.includes('const JDF='), 'the scientific Julian-date helper after the retired block must remain intact');

[
  'id="page-help"',
  '🚀 البداية السريعة',
  '📚 المراجع العلمية',
  'onclick="shareApp()"',
  'onclick="copyQibla()"',
  'function shareApp(',
  'function copyQibla(',
  'id="share-feedback"',
  'id="faq-list"',
  'function buildFAQ(',
  'function toggleFAQ(',
  '[JS-9] FAQ BUILDER',
  'faq-body-',
  'faq-icon-'
].forEach(function (token) {
  assert(!index.includes(token), 'unreachable FAQ runtime or empty presentation remains: ' + token);
});

assert.strictEqual(fs.existsSync('js/09-faq.js'), false, 'the unloaded FAQ shadow copy must stay deleted');

console.log('PASS unreachable Help/FAQ presentation and their private runtime stay retired');
