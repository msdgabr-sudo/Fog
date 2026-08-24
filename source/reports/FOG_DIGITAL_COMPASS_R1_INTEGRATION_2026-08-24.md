# Fog — Digital Compass R1 Integration Audit

Date: 2026-08-24  
Target repository: `fog` only  
Read-only reference: `qdev-r1-compare` at `1ea39f8`  
Upstream application reference inspected by Dev: `q-app-an` at `c38eaf0`

## Result

The isolated single-layer Digital Compass from Dev is integrated into Fog as a separate external presentation screen. The original astronomical compass fragment and its canonical `#cvs` and `#dev-slider` nodes remain mounted and unchanged for astronomical mode.

Digital mode now displays only `#qa-digital-compass-host > #qd-screen`. Legacy digital presentation children are hidden by the integration stylesheet; they are not deleted, cloned, replaced, or moved. Astronomical mode hides the new digital host and restores the existing astronomical presentation.

## Reference parity

- `digital-compass-renderer.js`: byte-for-byte equal to Dev, SHA-256 `1047ce8b2cf73ed9bedbea405a5664f3be7bafd2cf7ff8f5f6a7a6876fb5a58b`.
- `digital-compass-deviation.js`: byte-for-byte equal to Dev, SHA-256 `4e1ec0a190adfe4ad10c05654154122989666d8df9c32d4b0075275c1c03002a`.
- `digital-compass.css`: byte-for-byte equal after removing Dev's duplicate Google Fonts import; Fog already loads the same font families globally.
- `digital-compass.html`: byte-for-byte equal after changing only icon URLs from standalone `source/icons/` to application-root `icons/`.
- Reference layout constants remain unchanged: 420 px screen width, 48 px top inset, 46 px Home position, `min(97vw, 55vh, 500px)` compass footprint, and the Dev height breakpoints.

## Application boundary

- Fog retains one authoritative device-orientation owner: the existing application engine.
- The new bridge does not add `deviceorientation` or geolocation listeners.
- State is read from authoritative Fog values with canonical DOM fallbacks.
- Activation, GPS, calibration, and Home actions delegate to existing public application actions.
- The bridge does not write `QT`, `LAT`, `LON`, `deviceHeading`, GNSS trust/source, WMM/MDECL, camera state, or astronomical verification state.
- Unmounting the Digital Compass stops only its 50 ms presentation polling; it does not stop the application's compass sensor.

## Protected astronomical surface

Diff against Fog checkpoint `8b25804` for `index.html`, astronomical verification/session/observation/solver files, celestial detector, gravity reference, geomagnetic modules, and `WMM2025.COF`: **0 changed files**.

- `index.html` current and checkpoint SHA-256: `d4fcf06570e6662332982e8e02666a77c063db7e5045cf260d799df16194abb7`.
- `astronomical-verification-store.js` current and checkpoint SHA-256: `e56d1f1eb076c5f9eb02e63d97a8da756b856658c9feb4796dfa38b47a94529d`.

## Verification

Passed:

- All 8 Dev reference tests.
- Fog Digital Compass reference/integration contract.
- Controller press-to-activate and cleanup lifecycle.
- Digital screen host append/toggle/no-duplicate lifecycle.
- CSS/DOM namespace and single-layer isolation.
- Canonical compass host identity and offline cache contracts.
- Presentation scientific write barrier.
- Astronomical verification screen/scientific boundary.
- JavaScript syntax checks for every changed runtime module.
- Service-worker critical asset inventory: 78 entries, 0 missing.
- Repository-wide test run: 45 passed, 25 failed. The remaining failures are the pre-existing wider repository baseline areas documented before this integration; no protected astronomical file was changed to chase them.

Browser screenshot execution was attempted. The environment includes Playwright but no Chromium executable, and the recommended `agent-browser` command is not installed. Therefore no claim of a real rendered screenshot is made in this audit; runtime lifecycle and geometry were verified through deterministic source/DOM tests.

## Repository isolation

- `qdev-r1-compare`: clean after inspection.
- `q-app-an-compare`: clean after inspection.
- All implementation edits are contained in Fog.
