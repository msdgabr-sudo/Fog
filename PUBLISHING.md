# QiblaAstro publishing source

Current Fog candidate: version `4.1.7` / `versionCode` `4`, on `pre-aab/offline-adhan-priority`. This metadata update does not deploy `main` or build an AAB. The following publishing/provenance record describes the historical `3.1.0` baseline.

Production web publishing for `app.qiblalabs.com` is owned by this repository: `msdgabr-sudo/q-app-an`.

Historical release source:

- Branch: `release/aab-3.1.0`
- Web root: `source/`
- Frozen upstream source SHA recorded in `source/.release-source-sha`: `6e49775df5742413371a4165ea985173c43f5f5e`
- Custom domain: `app.qiblalabs.com` via `source/CNAME`
- Android package: `com.qiblalabs`
- Release version: `3.1.0` (`versionCode` 3)

The GitHub Pages deployment workflow publishes only `source/` from this repository. It does not require another repository at deployment time.

Signing keys and other secrets must remain outside the repository.
