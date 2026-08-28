'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sourceRoot = path.resolve(__dirname, '..');
const repoRoot = path.dirname(sourceRoot);
const read = name => fs.readFileSync(path.join(repoRoot, name), 'utf8');
const expectedName = '4.1.7';
const expectedCode = 4;
const config = JSON.parse(read('source/android-twa/twa-manifest.json'));

assert.strictEqual(config.packageId, 'com.qiblalabs', 'Android application identity must not change');
assert.strictEqual(config.appVersion, expectedName, 'owner-approved Android version name mismatch');
assert.strictEqual(config.appVersionCode, expectedCode, 'owner-approved Android version code mismatch');

for (const [file, tokens] of [
  ['source/android-twa/check_twa_config.py', ['"appVersion": "4.1.7"', '"appVersionCode": 4']],
  ['source/tools/pre_apk_check.py', ['EXPECTED_VERSION_NAME = "4.1.7"', 'EXPECTED_VERSION_CODE = "4"']],
  ['source/PRE_APK_ANDROID_IDENTITY.md', ['Version Name: `4.1.7`', 'Version Code: `4`']],
  ['source/android-twa/README.md', ['Version name: `4.1.7`', 'Version code: `4`', 'Do not generate or substitute a new Upload Key', 'check_aab_release.py']],
  ['source/android-twa/check_generated_release_identity.py', ['applicationId com.qiblalabs', 'versionCode 4', 'targetSdk 36']],
  ['source/android-twa/check_aab_release.py', ['Native .so libraries:', '--require-signature', 'base/res/raw/adhan_mecca.mp3']],
  ['README.md', ['Release line: `4.1.7`', 'Version code: `4`']],
  ['RELEASE_SOURCE.md', ['Version name: `4.1.7`', 'Version code: `4`']],
  ['REPOSITORY_STATE.md', ['Version name: `4.1.7`', 'Version code: `4`']],
  ['.github/workflows/deploy-app-pages.yml', ['cfg["appVersion"] == "4.1.7"', 'cfg["appVersionCode"] == 4']],
  ['.github/workflows/verify-release-snapshot.yml', ['QiblaAstro-4.1.7-code4-unsigned.aab', 'QiblaAstro-4.1.7-code4-unsigned-AAB-proof', '--skipVersionUpgrade', 'check_generated_release_identity.py', 'check_aab_release.py']],
  ['source/.github/workflows/a2-apk-rc.yml', ["m['appVersion']=='4.1.7'", "int(m['appVersionCode'])==4", "versionCode='4'", "versionName='4.1.7'", 'QiblaAstro-A2-4.1.7-RC-debug.apk', '--skipVersionUpgrade']],
  ['source/android-twa/build_signed_release.ps1', ['QiblaAstro 4.1.7 (code 4)', 'build-final-signed-aab.ps1', '-KeystorePath $KeystorePath', 'No signing key is accepted from inside the repository']],
  ['build-final-signed-aab.ps1', ['Version: 4.1.7 (code 4)', 'QiblaAstro-4.1.7-code4-final.aab', 'QiblaAstro-4.1.7-code4-final.apk', '--skipVersionUpgrade', "pre-aab/offline-adhan-priority", 'check_generated_release_identity.py', 'check_aab_release.py', '--require-signature', 'SCHEDULE_EXACT_ALARM']]
]) {
  const contents = read(file);
  for (const token of tokens) assert(contents.includes(token), `${file}: release contract missing ${token}`);
}

for (const file of [
  'source/android-twa/twa-manifest.json',
  'source/android-twa/check_twa_config.py',
  'source/tools/pre_apk_check.py',
  '.github/workflows/deploy-app-pages.yml',
  '.github/workflows/verify-release-snapshot.yml',
  'source/.github/workflows/a2-apk-rc.yml',
  'source/android-twa/build_signed_release.ps1',
  'build-final-signed-aab.ps1'
]) assert(!read(file).includes('3.1.0'), `${file}: stale application version in active packaging path`);

console.log('Android release identity: com.qiblalabs 4.1.7 (code 4), API 36, single guarded Windows signing path and AAB structural guards: PASS');
