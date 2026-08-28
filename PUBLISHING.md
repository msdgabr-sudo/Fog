# QiblaAstro publishing source

Current Fog release candidate: version `4.1.7` / `versionCode` `5`, on `pre-aab/offline-adhan-priority`.

## Current live ownership — do not change during preparation

Production web publishing for `app.qiblalabs.com` is still owned by `msdgabr-sudo/q-app-an` until the explicit Pages/domain cutover step.

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

## Code 3 migration safety

During the closed-test rollout, some devices can temporarily remain on versionCode 3 while the same origin serves the newer Fog Web/PWA.

The frozen Code 3 Android contract was reviewed against `msdgabr-sudo/q-app-an@228c2f91f9ae794fdb25560271bf67612309e94d`.

The release branch therefore keeps an explicit `LEGACY_CODE3_MIGRATION_GUARD=true` in `source/js/presentation/prayer/schedule-sync.js`:

- normal authenticated Prayer/Adhan full sync remains available to both Code 3 and Code 5;
- independent `widgetOnly` handoff is temporarily blocked because Code 3 does not understand that field and could otherwise mutate native Adhan state;
- a widget refresh may reuse the normal full sync only after the user already has an explicit/authorized prayer-delivery state;
- the Code 5 native `widgetOnly` capability remains present but dormant until Code 3 is retired;
- Azkar keeps the Code 3-compatible `qiblaastro://azkar-reminder` token/start/stop/interval/phrase contract;
- location remains on the delegated browser/TWA geolocation path;
- Digital Asset Links and package identity remain unchanged.

Both release CI and the Pages deployment workflow run `tests/code3-web-cutover-compatibility.test.js`, so a future incompatible Web change blocks the release/deployment gate.

## Cutover rule

Preparing this branch must not itself move the custom domain, alter DNS, or deploy Fog as production.

The intended order is:

1. Keep the existing closed-testing track active; do not delete versionCode 3 and do not stop the track.
2. Publish the already signed versionCode 5 / version 4.1.7 AAB to that same closed-testing track.
3. Confirm on at least one test device that Google Play has updated the installed wrapper from Code 3 to Code 5 and that the app opens correctly.
4. Transfer GitHub Pages/custom-domain ownership for `app.qiblalabs.com` from `q-app-an` to Fog while `LEGACY_CODE3_MIGRATION_GUARD` remains enabled. This allows Code 5 to receive the authoritative Fog Web while remaining Code 3 testers are protected during the transition.
5. On Code 5, validate the full combined release with priority on offline startup/reload, actual-time Adhan, advance prayer alerts, closed-app/Doze delivery, location/GNSS, camera/astronomical verification, and TWA fullscreen/Digital Asset Links verification.
6. Also smoke-test a remaining Code 3 device if available: app open, location, Prayer/Adhan existing state, Azkar reminder, and no unexpected Adhan state change.
7. Verify HTTPS, CNAME, Digital Asset Links, online load and offline reload before considering the Pages cutover complete.
8. After the closed-test population has moved off Code 3, remove/disable the migration guard in a separately reviewed Web change and re-enable independent Code 5 `widgetOnly` synchronization.

The root `.github/workflows/deploy-app-pages.yml` publishes only `source/` and remains `main`-triggered. Changes on `pre-aab/offline-adhan-priority` are preparation only and do not deploy the custom domain.
