# QiblaAstro publishing source

Current Fog release candidate: version `4.1.7` / `versionCode` `5`, on `pre-aab/offline-adhan-priority`.

## Current live ownership — do not change during preparation

Production web publishing for `app.qiblalabs.com` is still owned by `msdgabr-sudo/q-app-an` until the explicit Pages/domain cutover is approved.

Historical/current closed-test baseline:

- Android release: `3.1.0` (`versionCode` 3)
- Historical release source branch: `release/aab-3.1.0`
- Frozen upstream source SHA recorded in `source/.release-source-sha`: `6e49775df5742413371a4165ea985173c43f5f5e`
- Custom domain: `app.qiblalabs.com`
- Android package: `com.qiblalabs`

## Prepared Fog target

Fog is being prepared to become the single authoritative source for both the web/PWA and Android release line:

- Web root: `source/`
- Host: `app.qiblalabs.com`
- Package: `com.qiblalabs`
- Version name: `4.1.7`
- Version code: `5`
- `source/CNAME` is already `app.qiblalabs.com`.
- `source/.well-known/assetlinks.json` must retain the existing Google Play App Signing fingerprints.
- Upload/signing keys and other secrets must remain outside every repository.

## Cutover rule

Preparing this branch must not itself move the custom domain, alter DNS, or deploy Fog as production.

The intended order is:

1. Keep the existing closed-testing track active; do not delete versionCode 3 or stop the track.
2. Publish versionCode 5 to that same closed-testing track and allow testers to update from code 3 to code 5.
3. Validate code 5 on-device, with priority on offline startup, Adhan, advance prayer alerts, location/GNSS, and astronomical verification.
4. Only after that validation, transfer GitHub Pages/custom-domain ownership for `app.qiblalabs.com` from `q-app-an` to Fog.
5. Verify HTTPS, CNAME, Digital Asset Links/TWA fullscreen verification, online load and offline reload before considering the cutover complete.

The root `.github/workflows/deploy-app-pages.yml` publishes only `source/` and remains `main`-triggered. Changes on `pre-aab/offline-adhan-priority` are preparation only and do not deploy the custom domain.
