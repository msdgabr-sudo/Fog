# Fog pre-cleanup audit — 2026-08-24

## Scope and safety boundary

- Repository audited: `fog`, branch `main`, baseline commit `c0cc2721072514aff1c28b1db18adf3c6c5d4bbe`.
- Imported application source: exact `q-app-an` snapshot `c38eaf03a9fcfd9fd8197a0865cd4ff4f927cbac` before this report was added.
- The `q-app-an-compare` reference worktree remained clean and was not modified.
- This phase is inventory and evidence only. No production HTML, CSS, JavaScript, equation, sensor path, camera path, or verification cycle was changed.
- The astronomical-verification core is excluded from cleanup. It is mapped below only to prevent accidental edits.

## Repository inventory

- Repository tracked files: 717.
- Files below `source/`: 708.
- Main application types below `source/`: 228 JavaScript, 94 CSS, 17 HTML, 121 JSON, 75 Markdown, 53 PNG, 19 XML, 11 Java, and supporting assets/configuration.
- `index.html`: 4,662 lines, 262,756 bytes.
- Production page files:
  - `pages/compass.html`: 142 lines / 12,677 bytes.
  - `pages/prayer.html`: 69 lines / 6,522 bytes.
  - `pages/azkar.html`: 50 lines / 5,965 bytes.
  - `pages/quran.html`: 55 lines / 8,552 bytes.
  - `pages/serenity.html`: 23 lines / 6,791 bytes.
  - `pages/falaki.html`: 11 minified lines / 21,972 bytes. This is the declared exception and contains its own style and script.

## What `index.html` actually owns today

The assumption that every screen is already physically separate is not true in the current baseline.

| Screen/area | `index.html` lines | Current ownership |
|---|---:|---|
| Home | 296–350 | Full markup remains inline |
| Compass engine anchors | 352–358 | Canonical `#cvs` and `#dev-slider`; moved into the external fragment without cloning |
| Digital/astronomical compass host | 359 | Empty host; presentation fetched from `pages/compass.html` |
| Falaki host | 361 | Empty iframe host; special exception |
| Calibration | 370–492 | Full markup remains inline |
| Prayer host | 499 | Empty host; fragment mounted from `pages/prayer.html` |
| GNSS | 509–588 | Full markup remains inline |
| Map | 598–648 | Full markup remains inline |
| Settings | 658–755 | Full markup remains inline |
| Help | 765–822 | Full markup remains inline |
| Azkar host | 828 | Empty iframe host |
| Quran host | 830 | Empty iframe host |
| Serenity | 833–861 | Obsolete full markup remains inline even though a separate page also exists |
| Bottom navigation | 863–871 | Full markup and seven inline handlers remain inline |

Inline presentation debt by area:

| Area | Inline `style` attributes | Inline event handlers |
|---|---:|---:|
| Home | 3 | 0 |
| Calibration | 61 | 0 |
| GNSS | 57 | 2 |
| Map | 35 | 0 |
| Settings | 16 | 0 |
| Help | 36 | 2 |
| Legacy Serenity | 19 | 4 |
| Bottom navigation | 1 | 7 |

Whole-file totals: 308 inline style attributes and 21 inline handlers.

## Inline runtime still inside `index.html`

`index.html` has 11 script blocks: 9 external and 2 inline.

- Primary inline runtime: 3,627 lines / 181,412 bytes / SHA-256 `945a1d3a1f2a7fe418fc8b247e6becc7db81854e14974a9cdab8e8eaa5b5ea56`.
- Inline PWA block: 126 lines / 2,747 bytes / SHA-256 `1634254234a5a1796de6a9582a322323b6224488846601fc937d3f17d2e90fb7`.

The primary block is not presentation-only. It owns or participates in:

- compass inertia, orientation permission, sensor heading, activation and calibration;
- GNSS acquisition and trusted-location updates;
- Qibla, Sun, Moon, prayer-time and display calculations;
- canvas rendering for compass, map, shadow, Polaris and deviation;
- adhan playback and notification behavior;
- navigation, settings, share/help, splash and celebration;
- obsolete Quran and Serenity implementations.

Therefore, moving or deleting this block as one unit is unsafe. Extraction must be staged by responsibility with byte-for-byte behavior tests around sensitive sections.

## Confirmed runtime ownership conflicts

### Navigation

Navigation has multiple owners:

1. `GT()` is declared in the main inline block.
2. It is wrapped once to track `currentTab` and rewrite `body.className`.
3. It is wrapped again to maintain a private `_pageHistory` and call `history.pushState`.
4. `js/home-final.js` replaces `window.GT` again and intercepts `popstate` in capture phase.
5. `js/06-navigation.js` contains a newer navigation implementation but is not loaded by `index.html`; it is only listed in the service-worker cache.

This is operational coupling, not harmless duplication. A cleanup must nominate one navigation owner and preserve Back/TWA/Quran sub-navigation contracts before removing the others.

### Serenity

Serenity currently has three competing implementations:

1. Inline legacy markup and functions in `index.html`.
2. `js/serenity-quran-stream.js`, loaded by `js/home-final.js`, which can replace `#page-serenity`.
3. `pages/serenity.html` plus `js/presentation/serenity/screen.js`, mounted by the presentation bootstrap.

Because both external paths can replace the same live root during asynchronous startup, final ownership can depend on load timing. This is a real race condition. The legacy inline track list also points to five local MP3 files that do not exist; only `audio/يامنقذى فى شدتى.mp3` exists from that old set.

### Quran and Azkar

- The live Quran and Azkar screens are same-origin iframes.
- Complete legacy Quran logic and old Azkar effects remain in the parent inline runtime.
- `GT()` still calls legacy `qrInit`/deactivation paths when opening or leaving Quran.
- The page registry still describes older Quran/Azkar DOM contracts that do not match the current standalone iframe pages. The iframe hosts bypass those registry entries, so the registry is stale rather than authoritative.

### PWA registration

Service-worker registration, update listeners, install prompt handling, and network-state listeners exist in both `index.html` and `js/home-final.js`. This creates duplicate registration/listener ownership and two different update behaviors; the inline block can reload the page while the external block does not.

## Compass presentation status

- The canonical `#cvs` and `#dev-slider` nodes are created before engine startup and moved into `pages/compass.html` by `js/presentation/compass/host.js`; identity and uniqueness are explicitly checked.
- The external fragment is still markup-heavy: 87 inline style attributes and 7 inline handlers.
- Runtime loads root-level `js/compass-mode-view.js`, `js/compass-premium-render.js`, `js/compass-astro-dashboard.js` and root-level compass CSS skins.
- The intended presentation chain checked by the tests — host → digital adapter → digital layout → mode → astro dashboard — is not the chain loaded by `js/presentation/bootstrap.js`.
- `js/presentation/compass/digital-adapter.js` and `digital-layout.js` exist but are not reachable from the current production entry path.
- `js/compass-astro-dashboard.js` and `js/presentation/compass/astro-dashboard.js` are byte-identical duplicates; the root file is the loaded one.
- `css/compass-astro-dashboard.css` and `css/presentation/compass/astro-dashboard.css` are byte-identical duplicates; the root file is the loaded one.

No compass cleanup should start until the expected production chain and the accepted visual baseline are reconciled with the current bootstrap tests.

## Head and resource defects

Confirmed defects:

- Broken Quran font URL in `index.html`: `fonts/KFGQPC-Uthmanic-Script-HAFS.woff2` is requested, but the actual file is `fonts/KFGQPC-Uthmanic-ScriptHAFS.woff2`.
- The same wrong filename appears in `css/quran-reader.css`.
- `css/22-azkar.css` contains two URLs relative to `css/images/`, which does not exist. That stylesheet is not in the current runtime reachability closure, but the references are still invalid.
- `pages/compass.html` is a fragment, not a valid standalone page: its `icons/...` references resolve correctly only after the fragment is mounted into the parent document.

Exact duplicate head tags:

- `theme-color`: 2.
- `msapplication-TileColor`: 2.
- `apple-mobile-web-app-capable`: 2.
- `apple-mobile-web-app-status-bar-style`: 2.
- `apple-mobile-web-app-title`: 2.
- `mobile-web-app-capable`: 3.
- `application-name`: 2.
- `format-detection`: 2.
- `screen-orientation`: 2.
- Google Fonts preconnect: 3 for `fonts.googleapis.com` and 2 for `fonts.gstatic.com`.

The head initially loads 35 stylesheets, including 14 successive Home stylesheets. Their order is behaviorally significant because later files override earlier ones.

## Conservative runtime reachability inventory

The following files were not reachable from the current production entry graph during static analysis. This list is a candidate-review list, not authorization to delete. Service-worker-only references, tests, documentation, generated workflows, dynamic construction, and protected scientific scope must be checked individually.

### JavaScript candidates (44)

`js/01-inertia.js`, `02-adhan.js`, `03-azkar-engine.js`, `04-core.js`, `04-wmm2025.js`, `05-gnss.js`, `06-navigation.js`, `07-settings.js`, `08-share.js`, `09-faq.js`, `10-astronomy.js`, `100-reference-dashboard-stage2.js`, `101-reference-home-rebuild-stage4.js`, `11-prayer.js`, `12-compass-canvas.js`, `13-polaris.js`, `14-shadow.js`, `15-polar-drift.js`, `16-map.js`, `18-sky-bg.js`, `19-main-loop.js`, `20-device-compass.js`, `21-quran.js`, `22-init.js`, `22-wmm2025-engine.js`, `99-misc.js`, `analytics/privacy-safe-screen-tracker.js`, `astronomical/loader.js`, `astronomical/module-manifest.js`, `camera-engine.js`, `celestial-live-calibration.js`, `celestial-solver.js`, `engines/wmm2025-isolated.js`, `i18n/direction.js`, `i18n/unified-phrases.js`, `integration.js`, `presentation/azkar/back-history.js`, `presentation/compass/astro-dashboard.js`, `presentation/compass/digital-adapter.js`, `presentation/compass/digital-layout.js`, `presentation/compass/mode-view.js`, `presentation/quran/back-history.js`, `system-check.js`, `wmm2025-standalone.js`.

Important qualification: iframe-injected `presentation/azkar/back-history.js` and `presentation/quran/back-history.js` are reachable in a nested document even though a root-relative static traversal can miss them. They must not be deleted.

### CSS candidates (28)

`css/22-azkar.css`, `29-horizon-design-system.css`, `30-horizon-compass-instruments.css`, `31-horizon-home-header.css`, `32-horizon-navigation.css`, `33-horizon-mega-interface.css`, `34-horizon-square-dashboard.css`, `35-horizon-dashboard-grid.css`, `36-horizon-dashboard-polish.css`, `36-horizon-reference-parity.css`, `37-horizon-hero-mega-phase1.css`, `37-horizon-reference-home.css`, `38-approved-reference-layout.css`, `39-horizon-mega-phase2-dashboard-nav.css`, `40-horizon-mega-phase3-identity-motion.css`, `41-horizon-mega-phase4-final-polish.css`, `42-horizon-mega-phase5-cross-page-finish.css`, `42-horizon-screenshot-correction.css`, `43-reference-match-stage1.css`, `44-reference-dashboard-stage2.css`, `45-reference-navigation-polish-stage3.css`, `46-reference-home-rebuild-stage4.css`, `47-phone-reference-final-stage5.css`, `home-button-icons-polish.css`, `presentation/compass/astro-dashboard.css`, `presentation/compass/digital-final-fixes.css`, `presentation/compass/digital-visual-match.css`, `style.css`.

## Astronomical-verification protected boundary

Do not edit, move, rename, deduplicate, or reformat these files during application cleanup without a separate scientific-change phase:

- `js/astro-verification.js`
- `js/astronomical-trace.js`
- `js/position-provider.js`
- `js/coordinate-frames.js`
- `js/world-orientation.js`
- `js/camera-projection.js`
- `js/camera-pose.js`
- `js/gravity-reference.js`
- `js/astro-qibla-engine.js`
- `js/verification-quality.js`
- `js/celestial-detector.js`
- `js/astronomical-solver.js`
- `js/qibla-alignment-reticle.js`
- `js/astronomical-observation-bridge.js`
- `js/astronomical-observatory-ui.js`
- `js/astronomical-verification-store.js`
- `js/astronomical-verification-session.js`
- `css/28-astronomical-observatory.css`

Presentation gateways that touch this boundary — `js/compass-cards.js`, `js/qibla-card-runtime.js`, compass astro controls/dashboard/live-heading modules, and their CSS — also require protected-boundary regression tests even when the edit is visual only.

## Verification baseline before cleanup

### Syntax

- All production JavaScript files checked with `node --check` passed.
- `service-worker.js` passed syntax checking.
- `scripts/audit-index-surgery.js` and `scripts/project-inventory.js` passed syntax checking.
- `scripts/audit-index-deep.js` does not parse. Line 24 contains a quoted regular-expression construction with unescaped quote delimiters.

### Test suite

Executed all 66 Node test files from the correct `source/` working directory:

- Passed: 39.
- Failed: 27.

Failure clusters:

- service-worker version/cache contract and missing offline astronomical assets;
- stale inline-runtime SHA contract;
- compass bootstrap order not loading the expected adapter/layout chain;
- stale Quran/Azkar safe-page contracts;
- Home background exists on disk but is absent from the service-worker offline list;
- Falaki wiring expectation differs from the current bootstrap architecture;
- protected astronomical capture/session/display expectations;
- one GNSS permission-state expectation;
- `qibla-card-runtime.js` protected-boundary token expectation.

This is the inherited baseline. These failures existed before any cleanup change in `fog`.

### Protected-core hash gate

`node scripts/check-protected-core.js` currently fails before cleanup because:

- expected blob for `js/astronomical-verification-store.js`: `29b7ac0dee7259a25a4a51bea00eb1bcb66d20e7`;
- actual blob: `86931360c8590d5b807dca1b3ec73cd131a51aaa`.

The file itself was not modified in this audit. The lock and imported source disagree and must be reconciled by identifying the authoritative protected baseline, not by editing the scientific file during cleanup.

### Service-worker resource list

- `CRITICAL_PRESENTATION` contains 66 entries.
- All 66 paths exist on disk.
- Existing tests still fail because the list omits assets/modules required by their offline contracts and because the cache-version format differs from the expected format.

## Safe cleanup sequence

1. Freeze the accepted protected-core hashes and clarify whether the lock or the imported store is authoritative. Do not change the store in this cleanup.
2. Repair audit tooling and create a deterministic production-entry dependency report.
3. Establish one navigation/history owner and add regression tests before removing legacy wrappers.
4. Establish one Serenity owner, then remove the race and obsolete local-track implementation.
5. Reconcile page registry contracts with iframe-based Quran/Azkar ownership.
6. Correct resource URLs and deduplicate exact head metadata without changing runtime behavior.
7. Externalize remaining non-protected screen markup one screen per commit: Help, Settings, Map, GNSS, Calibration, then Home/navigation shell.
8. Split the primary inline runtime by responsibility only after each extracted block has syntax, load-order, DOM-contract and behavior tests.
9. Review unreachable candidates in small groups; delete only after proving no runtime, iframe, service-worker, native/TWA, test, or workflow dependency.
10. Re-run the full suite, protected boundary, PWA/offline checks, and visual/device acceptance after every stage.

## Current conclusion

The application is not ready for broad deletion or a one-shot `index.html` split. It has valid external screens, but also stale inline implementations, multiple runtime owners, inactive shadow modules, broken audit tooling, a protected-hash disagreement, and 27 inherited test failures. Cleanup is feasible, but it must be surgical and staged; the astronomical verification equation and cycle remain outside the permitted edit scope.
