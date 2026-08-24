'use strict';

const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html', 'utf8');

assert(index.includes('id="page-help"'), 'the live Help screen must remain available');
assert(index.includes('🚀 البداية السريعة'), 'the Help quick-start guide must remain available');
assert(index.includes('📚 المراجع العلمية'), 'the Help scientific references must remain available');
assert(index.includes('onclick="shareApp()"'), 'the Help share action must remain wired');
assert(index.includes('onclick="copyQibla()"'), 'the Help Qibla copy action must remain wired');
assert(/function\s+shareApp\s*\(/.test(index), 'the live share handler must remain defined');
assert(/function\s+copyQibla\s*\(/.test(index), 'the live Qibla copy handler must remain defined');
assert(index.includes('const JDF='), 'the scientific Julian-date helper after the retired block must remain intact');

[
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

console.log('PASS Help stays live while the unreachable FAQ presentation and shadow runtime stay retired');
