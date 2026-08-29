/* QiblaAstro — retired compatibility placeholder.
 *
 * This controller is no longer loaded by the current Prayer presentation
 * bootstrap and the current Prayer page contains no audio-readiness UI.
 *
 * The file path is intentionally retained for Code 5 offline-shell compatibility
 * because the current service-worker app shell still precaches this exact URL.
 * Keeping an inert placeholder avoids touching the working service worker during
 * repository cleanup and prevents an atomic precache install from failing on 404.
 *
 * Remove this file together with its service-worker precache entry only during a
 * separately reviewed service-worker generation change.
 *
 * No runtime behavior is implemented here.
 */
