# QiblaAstro Project Context

## 1. Project Vision
QiblaAstro is an educational astronomical Qibla platform designed to provide a trusted, scientifically grounded experience for determining and understanding the Qibla. It combines an independent GNSS/computational Qibla system with an independent astronomical verification system based on direct observation of the Sun or Moon.

Guiding principles: scientific accuracy, user trust, privacy, educational value, authentic Islamic reference where Islamic guidance is presented, high performance, and a distinctive premium interface. The first three seconds must communicate that QiblaAstro is not a generic compass. The Kaaba is the visual center; Earth, sky, light, celestial bodies, and restrained holographic instruments explain the concept.

## 2. Current Architecture
The project contains two strictly separated engines and one additive presentation layer.

### A. GNSS / Computational Qibla System
- Receives computational-Qibla latitude and longitude only from a trusted browser/device Geolocation fix; prayer-only manual locations remain isolated from this path.
- Calculates geographic Qibla bearing from the user to the Kaaba.
- Updates GNSS and computational-Qibla UI values.
- Main runtime: `js/05-gnss.js`.
- Normalized provider: `js/position-provider.js`.
- Future maintenance task: unify both location paths without changing the astronomical system.

### B. Astronomical Verification System
- Uses camera observation of the Sun or Moon.
- Detects and tracks the celestial body.
- Runs the raw astronomical solver.
- Separates celestial/camera heading from solved Qibla bearing.
- Stores solved astronomical Qibla in the canonical verification store.
- Updates the astronomical Qibla card and closes the camera after successful capture.
- Provides an isolated post-verification live Sun/Moon compass.
- Live astronomical deviation is UI-only and never overwrites the raw record.

### C. Presentation Layer
- Presentation code must never calculate, overwrite, store, or mutate GNSS or astronomical results.
- `index.html` owns the static Home markup; `js/home-final.js` binds live values and owns Home history/PWA integration without generating replacement markup.
- Independent screens are loaded through their page hosts and screen-specific CSS/JavaScript. GNSS remains the intentionally small inline exception.
- The digital compass is isolated in `pages/digital-compass.html`, `css/digital-compass/`, and `js/digital-compass/`, with its host under `js/presentation/compass/`.
- The old numbered Horizon CSS experiment chain is retired and is not part of the production cascade.

## 3. Repository Structure
Important paths:

- `index.html` — main application shell, embedded legacy pages, and hosts for the separated screens.
- `PROJECT_CONTEXT.md` — official Single Source of Truth.
- Numbered CSS retained between `css/01-variables.css` and `css/28-astronomical-observatory.css` — established application styles; retired numbers are intentionally absent.
- `css/home-*.css` — production Home presentation layers loaded explicitly by `index.html`.
- `css/internal-screen-chrome.css` and `css/presentation/` — shared and screen-specific external-page presentation.
- `css/digital-compass/` — isolated digital-compass presentation.
- `css/27-animations.css` — active-page scrolling and ambient background only; it imports no historical Horizon layer.
- `css/46-reference-home-rebuild-stage4.css` — retained solely for `reference-preview.html`, not loaded by production `index.html`.
- `js/05-gnss.js` — GNSS runtime.
- `js/10-astronomy.js` — astronomical calculations and legacy geographic Qibla calculation.
- `js/20-device-compass.js` — device compass runtime.
- `js/home-final.js` — Home live-value mirroring, top-level navigation ownership, and PWA registration ownership.
- `js/astronomical-verification-session.js` — verification state flow.
- `js/astronomical-verification-store.js` — canonical astronomical record.
- `js/post-verification-live-compass.js` — isolated live celestial compass after verification.
- `service-worker.js` — atomic offline App Shell/runtime, currently `qiblaastro-v5.70-offline-native-20260826`.
- `tests/` — astronomical and isolation tests.

## 4. Completed Features
### Core and product features
- Stable Arabic RTL PWA shell with offline support.
- GNSS/computational Qibla calculation and UI.
- Digital-compass deviation distance is derived only from a trusted, in-range GNSS fix; no fabricated fallback distance is published before location is available.
- Prayer times, Quran, Azkar, settings, navigation, serenity/audio, astronomy, calibration, help, and about modules.
- Camera-based Sun/Moon astronomical verification.
- Celestial detection and tracking.
- Automatic capture after stable observation.
- Correct separation between celestial/camera heading and solved astronomical Qibla.
- Canonical astronomical record storage and direct DOM update.
- Camera finalization and close after successful capture.
- Isolated post-verification live Sun/Moon compass.
- Live astronomical deviation separated from raw stored verification values.

### Horizon design history
- Phase 1: Kaaba/Earth Hero foundation and mirrored Qibla/GNSS values.
- Phase 2: premium home instrument cards.
- Phase 3: compass instrument framing and semantic measurement-card styling.
- Phase 4: home identity, language, dates, and next-prayer header.
- Phase 5: floating navigation, active states, and safe-area behavior.
- Phase 6: premium cross-page Mega Interface.
- Phase 7: square home cards.
- Phase 8: robust semantic dashboard grid without cloning cards.
- Phase 9: dashboard lighting, per-card accents, and deliberate final odd tile.
- Phase 10: approved-reference home composition.
- Phase 11: exact CSS support for the real generated reference markup.
- Phase 12 / Mega Phase 1: deeper cosmic Hero, astronomical arc, larger bearing, Sun/Moon instruments, Earth horizon, Kaaba, date/prayer panel, and system strip.
- Phase 13 / Mega Phase 2: dense services matrix, compact icon stages, telemetry strip, floating command dock, and navigation refinement.
- Phase 14 / Mega Phase 3: unified identity, calmer sky, refined celestial instruments, stronger bearing hierarchy, guidance beam, Earth atmosphere, Kaaba depth, service-card family, status strip, dock, and restrained motion.
- Phase 15 / Mega Phase 4: completed the final home-screen correction layer with tighter viewport rhythm, directional arc labels and ticks, stronger central guidance geometry, larger atmospheric Earth, larger Kaaba anchor, compact date/prayer panel, consistent four-column services matrix, deliberate narrow-phone three-column fallback, compact telemetry strip, floating command dock, performance safeguards, reduced-motion support, and Service Worker v5.32 caching.
- Phase 16 / Mega Phase 5: extended the finalized Horizon identity across all secondary pages. Added shared cosmic page atmosphere, premium hero surfaces, compact section dividers, unified optical cards, stronger compass instrument framing, prayer-state hierarchy, Quran-only reading typography, Azkar single-card treatment, settings/GNSS control styling, astronomy/calibration/serenity media surfaces, responsive phone tuning, accessibility focus states, reduced-motion support, slow-update fallbacks, and Service Worker v5.33 caching. No engine, solver, store, or calculation code was changed.

### Ownership
Copyright attribution preserved:
- `محمد سيد جبر بحيرى`
- `Mohamed SG Behairy`

## 5. Pending Features
Priority order:
1. Real-phone screenshot validation of the home screen and all major secondary pages.
2. One measured pixel-correction pass based on real screenshots, especially Hero height, Earth crop, Kaaba position, Arabic label fit, dock clearance, compass cards, Quran list density, and Azkar counter scale.
3. Complete the dedicated QiblaAstro icon system and replace remaining generic symbols where necessary.
4. Keep the retired Horizon experiment chain absent; its deletion is guarded by `tests/numbered-shadow-retirement.test.js`.
5. Refactor GNSS independently: unify location paths, add accuracy/freshness/stability gates, separate device/network/manual/default sources, and correct stale-position and magnetic-declination behavior.
6. Repair or retire obsolete GitHub Actions workflows.
7. Complete real-device regression validation of astronomical capture, record, live compass, and deviation.

## 6. Current Working Task
Release the four requested Android/PWA capabilities from `fog` under `com.qiblalabs`: closed-app Adhan, native local voice Dhikr reminders, a complete offline shell, and an event-driven prayer/Qibla widget, while preserving the astronomical-verification equations and cycle unchanged.

Current checks:
- keep actual prayer delivery on user-granted exact alarms, with an idle-safe approximate fallback and visible local media-playback foreground service;
- keep Azkar reminders local, user-started, notification-permission-gated, and inexact to respect battery and Play policy;
- authenticate every web-to-native handoff with a per-install token and lock Android intents to `com.qiblalabs`;
- cache the complete App Shell, Quran text, local Adhan/Azkar audio, and protected scientific modules atomically;
- refresh installed widgets only at prayer boundaries and from the app-private dated schedule;
- keep version `3.1.0` / code `3` and preserve all astronomical calculation and verification contracts.

## 7. Last Changes
- Retired the unloaded CSS experiment chain `29`–`45` plus `47` after reading all 21 files and proving that no production or preview loader references them.
- Preserved `css/46-reference-home-rebuild-stage4.css` and `js/101-reference-home-rebuild-stage4.js` because `reference-preview.html` actively loads them.
- Added a regression contract that prevents the retired runtime and presentation shadows from returning.
- Kept the static Home, independent digital-compass screen, screen hosts, and Service Worker critical presentation set intact.
- Made the digital-compass activation instruction explicit and cascade-resistant.
- Removed the fabricated 1,300 km deviation fallback; the calculator now waits for a trusted GNSS fix and derives each distance from the current location.
- Hardened GNSS coordinate-range validation and decoupled true-Qibla publication from magnetic WMM availability.
- Added executable international coverage for Qibla, prayer civil time/regional method selection, and deviation distance.
- Added Play-policy-aware native Android delivery for background Adhan, local Azkar voice reminders, an authenticated prayer-data bridge, and an event-driven prayer/Qibla widget under `com.qiblalabs`.
- Completed the atomic offline App Shell, Quran text set, protected astronomical modules, and local Adhan/Azkar audio caching with byte-range playback support.
- Added an idempotent cross-platform native injector plus hermetic Android structure tests, without changing version `3.1.0` / code `3` or any protected astronomical file.
- The full suite is now `84 = 73 pass + 11 classified inherited failures`, with no new failure.
- Matched the qappan two-state live-compass copy exactly: `اضغط للتفعيل` before the explicit card press and `البوصلة الحية` immediately after it.
- Re-audited the qappan/Fog canvas radius, smoothing, responsive canvas sizes, card-row heights, and deviation-panel heights. The source geometry is identical; the apparent vertical shift in the supplied pair comes from comparing standalone display mode with a browser viewport reduced by its toolbar.
- Added a controller-local activation gate: an existing/cached host heading can no longer skip `اضغط للتفعيل`; the displayed heading, deviation, confidence, and dial remain idle until the card is pressed.
- Matched the qappan active-screen shell by locking the digital route to `100svh` and suppressing the document scrollbar. A same-viewport browser measurement had shown the Fog screen/Home control shifted 15 px by that scrollbar even though the compass and card dimensions themselves matched.
- Bumped the digital-screen asset queries to `20260825-activation-layout2` and the Service Worker to `r8-activation-layout2` so the fixed controller and shell cannot be masked by the previous cache generation.
- No astronomical solver, verification session, verification store, raw equation, or verification-cycle file was changed.

## 8. Important Decisions
1. Work and publish only from the `fog` repository; keep the qappan reference repository read-only.
2. GNSS/computational Qibla and astronomical verification remain independent.
3. Raw astronomical results are protected from UI writes.
4. Celestial heading is not Qibla bearing.
5. Live deviation is UI-only.
6. Design changes preserve runtime contracts.
7. Existing dynamic DOM remains authoritative.
8. Dashboard code may move existing cards but never clone or replace them.
9. Navigation state remains owned by the existing runtime.
10. Large visible design batches are preferred.
11. The approved reference image is the visual target, not merely an inspiration.
12. The Kaaba and Earth are the primary visual story; cards are compact supporting instruments.
13. Mega phases are presentation-only unless the owner explicitly starts a separate engine task.
14. Navigation routes remain accessible until a product decision authorizes route reduction.
15. Motion must remain restrained, performance-safe, and fully disabled when reduced motion is requested.
16. Mega Phase 4 is implementation-complete but not visually accepted until a real-device screenshot is compared.
17. Mega Phase 5 establishes one shared visual language across the product without modifying application logic.

## 9. Constraints
- Do not modify or publish any repository other than the dedicated `fog` working repository.
- Do not modify the raw astronomical equation through UI code.
- Do not allow GNSS and astronomical values to overwrite each other.
- Do not reintroduce retired camera, celestial-solver, or tracking-lock logic.
- Do not secretly use magnetic compass data inside astronomical verification.
- Preserve working IDs, handlers, stores, and active-state contracts.
- Preserve copyright attribution.
- Maintain PWA and Android compatibility and acceptable mid-range-device performance.
- Respect `prefers-reduced-motion` and safe areas.
- Keep Quran typography scoped to Quran content.
- Update this file after every task or architectural change.

## 10. Known Issues
- Real-device screenshot validation remains required; cloud Chromium comparison is available and useful for DOM geometry, but it cannot reproduce Android browser chrome, physical sensor permissions, or every device pixel ratio.
- Older high-specificity and inline styles may still cause local cascade conflicts.
- Long Arabic labels may need device-specific final tuning.
- GNSS remains split between `js/05-gnss.js` and `js/position-provider.js`.
- Obsolete workflows may still fail.
- The inherited full test suite still contains separately classified legacy-contract, offline-shell, and protected astronomical-behavior failures.

## 11. Next Step
Complete the GitHub unsigned-AAB compile proof, then sign from the external upload keystore and run real-device locked-screen/Doze, reboot, exact-alarm revocation, notification revocation, offline restart, audio-focus, and widget-boundary tests before Play submission.

## 12. Session Handoff
The web release now carries an authenticated package-scoped bridge, date-stamped 14-day native prayer plan, bundled foreground Adhan service, local inexact Azkar voice reminders, app-private event-driven widget, and atomic offline shell. Android identity remains `com.qiblalabs`, version remains `3.1.0` / code `3`, and signing material remains outside the repository. The astronomical solver, equations, store, verification cycle, and protected WMM runtime remain untouched. Continue with the compile artifact and real-device/Play Console validation without changing protected astronomical behavior.
