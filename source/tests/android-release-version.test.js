'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sourceRoot = path.resolve(__dirname, '..');
const repoRoot = path.dirname(sourceRoot);
const read = name => fs.readFileSync(path.join(repoRoot, name), 'utf8');

const release = JSON.parse(read('release-config.json'));
const android = release.android || {};
const artifacts = release.artifacts || {};
const expectedName = android.versionName;
const expectedCode = android.versionCode;
const config = JSON.parse(read('source/android-twa/twa-manifest.json'));

assert.strictEqual(release.schemaVersion, 1, 'release-config schema must remain explicit');
assert.strictEqual(release.releaseChannel, 'production', 'release-config must describe production');
assert.ok(expectedName, 'release-config missing Android version name');
assert.ok(Number.isInteger(expectedCode) && expectedCode > 0, 'release-config missing valid Android version code');
assert.strictEqual(config.packageId, android.packageId, 'Android application identity drifted from release-config.json');
assert.strictEqual(config.host, android.host, 'Android production host drifted from release-config.json');
assert.strictEqual(config.appVersion, expectedName, 'Android version name drifted from release-config.json');
assert.strictEqual(config.appVersionCode, expectedCode, 'Android versionCode drifted from release-config.json');
assert.strictEqual(config.minSdkVersion, android.minSdkVersion, 'Android minSdk drifted from release-config.json');
assert.strictEqual(config.signingKey.path, android.signingKeyRelativePath, 'upload-key path contract drifted');
assert.strictEqual(config.signingKey.alias, android.signingAlias, 'upload-key alias contract drifted');
assert.strictEqual(artifacts.unsignedAab, `QiblaAstro-${expectedName}-code${expectedCode}-unsigned.aab`, 'unsigned AAB name must derive from release identity');
assert.strictEqual(artifacts.unsignedAabProofName, `QiblaAstro-${expectedName}-code${expectedCode}-unsigned-AAB-proof`, 'AAB proof artifact name must derive from release identity');

for (const [file, tokens] of [
  ['source/tools/verify_release_config.py', ['release-config.json', 'service-worker.js', 'twa-manifest.json']],
  ['source/tools/pre_apk_check.py', ['release-config.json', 'ANDROID.get("versionName")', 'SERVICE_WORKER.get("version")']],
  ['source/android-twa/check_twa_config.py', ['release-config.json', 'android.get("versionName")', 'android.get("versionCode")']],
  ['source/android-twa/check_generated_release_identity.py', ['release-config.json', 'targetSdkVersion', 'versionCode']],
  ['.github/workflows/verify-release-snapshot.yml', ['run_release_test_suite.py --profile android', 'AAB_FILENAME', 'AAB_ARTIFACT_NAME', 'check_generated_release_identity.py', 'check_aab_release.py']],
  ['.github/workflows/deploy-app-pages.yml', ['run_release_test_suite.py --profile web', 'pull_request:', 'needs: verify']]
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

console.log(`Android release identity: ${android.packageId} ${expectedName} (code ${expectedCode}), API ${android.targetSdkVersion}, governed by release-config.json: PASS`);
