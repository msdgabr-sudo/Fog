# QiblaAstro — Presentation Page Integration Contracts

## Purpose

Prepare Quran, Azkar, and Serenity as replaceable presentation modules while keeping every astronomical verification, camera, capture, solver, equation, quality gate, store, and scientific runtime untouched.

## Non-negotiable boundary

Presentation files MUST NOT import, call, mutate, duplicate, or replace any astronomical/camera core module. New designs may change markup, classes, layout, CSS, icons, images, animations, and presentation-only behavior, but they must preserve the public IDs and handler contracts required by their existing page logic.

## Stable paths

- `pages/quran.html`
- `pages/azkar.html`
- `pages/serenity.html`
- `css/presentation/serenity/screen.css`
- `js/presentation/quran/host.js`
- `js/presentation/quran/back-history.js`
- `js/presentation/azkar/host.js`
- `js/presentation/azkar/back-history.js`
- `js/presentation/page-registry.js`
- `js/presentation/page-loader.js`

## Activation policy

The Quran screen is mounted directly as a same-origin iframe by `quran/host.js`; its
nested Reader → index history is owned only by `quran/back-history.js`. It is not a
page-loader fragment and must not be registered in `page-registry.js`.

The Azkar screen follows the same ownership rule: `azkar/host.js` mounts the
standalone page, while `azkar/back-history.js` owns Home/Reader/Audio child history.
It is not a page-loader fragment and must not be registered in `page-registry.js`.

For pages that still use the guarded page loader, a page is activated only after:

1. The incoming design is placed in its page/CSS presentation slot.
2. Required IDs are verified.
3. Duplicate IDs are rejected.
4. Protected scientific/camera tokens are rejected.
5. Existing page behavior is regression-tested.
6. Only that one page is activated.

## Quran required IDs

`qrApp`, `qrHome`, `qrReader`, `qrSurahList`, `qrSearchInput`, `qrReaderSurah`,
`qrText`, `qrFontMinus`, `qrReaderBookmark`, `qrReaderBack`.

## Azkar required IDs

`azkarApp`, `azHome`, `azReader`, `azAudio`, `azCategoryGrid`, `azBackHome`,
`azDhikrText`, `azAudioPhrase`, `azAudioToggle`.

## Serenity required IDs

`page-serenity`, `sk-canvas`, `sk-track-list`, `sk-now-title`, `sk-now-sub`, `sk-progress`, `sk-current`, `sk-duration`, `sk-play-btn`.

## Scientific exclusion

No page fragment or page-specific presentation stylesheet/script may contain astronomical solver, verification session/store, observation bridge, camera projection/pose, celestial detector, gravity reference, `getUserMedia`, camera capture, or scientific result symbols.

## Design import rule

When approved new screen designs arrive, import them into their standalone page and
controller files rather than copying a whole replacement `index.html`. This keeps
design evolution physically separated from the protected scientific core.

© 2026 محمد سيد جبر بحيرى — Mohamed SG Behairy. All Rights Reserved.
