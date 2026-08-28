'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sourceRoot = path.resolve(__dirname, '..');
const repoRoot = path.dirname(sourceRoot);
const read = name => fs.readFileSync(path.join(repoRoot, name), 'utf8');

const expectedName = '4.1.7';
const expectedCode = 5;
const config = JSON.parse(read('source/android-twa/twa-manifest.json'));

assert.strictEqual(config.packageId, 'com.qiblalabs', 'Android application identity must not change');
assert.strictEqual(config.appVersion, expectedName, 'owner-approved Android version name mismatch');
assert.strictEqual(config.appVersionCode, expectedCode, 'Google Play versionCode must be 5 because code 4 was already uploaded');
assert.strictEqual(config.minSdkVersion, 23, 'minSdk must remain 23');
assert.strictEqual(config.signingKey.path, './keystore/qiblaastro-upload.jks', 'upload-key path contract drifted');
assert.strictEqual(config.signingKey.alias, 'qiblaastro', 'upload-key alias contract drifted');

for (const [file, tokens] of [
  ['source/android-twa/check_twa_config.py', ['"appVersion": "4.1.7"', '"appVersionCode": 5']],
  ['source/tools/pre_apk_check.py', ['EXPECTED_VERSION_NAME = "4.1.7"', 'EXPECTED_VERSION_CODE = "5"']],
  ['source/PRE_APK_ANDROID_IDENTITY.md', ['Version Name: `4.1.7`', 'Version Code: `5`']],
  ['source/android-twa/check_generated_release_identity.py', ['applicationId com.qiblalabs', 'versionCode 5', 'targetSdk 36']],
  ['source/android-twa/check_aab_release.py', ['Native .so libraries:', '--require-signature', 'base/res/raw/adhan_mecca.mp3']],
  ['.github/workflows/verify-release-snapshot.yml', ['QiblaAstro-4.1.7-code5-unsigned.aab', 'QiblaAstro-4.1.7-code5-unsigned-AAB-proof', '--skipVersionUpgrade', 'check_generated_release_identity.py', 'check_aab_release.py']]
]) {
  const contents = read(file);
  for (const token of tokens) assert(contents.includes(token), `${file}: release contract missing ${token}`);
}

for (const file of [
  'source/android-twa/twa-manifest.json',
  'source/android-twa/check_twa_config.py',
  'source/tools/pre_apk_check.py',
  'source/android-twa/check_generated_release_identity.py',
  '.github/workflows/verify-release-snapshot.yml'
]) {
  const contents = read(file);
  assert(!contents.includes('appVersionCode": 4'), `${file}: stale active versionCode 4`);
  assert(!contents.includes('EXPECTED_VERSION_CODE = "4"'), `${file}: stale active versionCode 4 gate`);
  assert(!contents.includes('versionCode 4'), `${file}: stale generated versionCode 4 gate`);
  assert(!contents.includes('code4-unsigned'), `${file}: stale code4 AAB artifact name`);
}

console.log('Android release identity: com.qiblalabs 4.1.7 (code 5), API 36, offline/Adhan release gates and unsigned-AAB proof path: PASS');
