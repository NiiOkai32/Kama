# Kama for Android — 1.0.2

**[Download the signed APK](https://github.com/NiiOkai32/Kama/raw/refs/heads/android-apk/downloads/kama-android-v1.0.2.apk)**

Android 8.0 or newer (API 26+), with Android System WebView 105+; a current WebView is recommended. Universal Java/WebView APK, with no CPU-specific native library. This is a direct-install APK, not a Play Store publication.

## Install

Download `kama-android-v1.0.2.apk` on your Android phone, open it, and allow installation from that browser/file app if Android asks. No Netlify deployment, server build or merchant account is needed to install it.

Choose **Play on this device** for offline local play. The complete game decks, supplied questions, local game modes, drink/custom/playful forfeits, images, favourites, custom cards, boundaries, deck backups and privacy controls are bundled. The APK does not download the game homepage to work. Local play does not start an Auth client or send backend requests.

Sign in with internet access for accounts and remote Duet. The APK includes Duet's interface and server connection; hosting still requires an active server-side membership and invitations still require two signed-in accounts. The proposed US$2.99/month checkout remains **disabled**, pending merchant approval and billing implementation. No purchase, membership grant or fake entitlement is embedded in the APK. The app does not make remote multiplayer work without a network.

Email verification and password reset links use the existing hosted Kama website in the phone's browser. Finish the email action there, then return to the app and sign in. Browser and app saves/sign-in are separate profiles. No app-link/deep-link verification has been registered for the public GitHub Pages domain.

## Included Android integration

- All 37 web files ship in the APK. Source snapshot: `c77fa3ce29110909fb76dd41fcc0466b876e8ea5` from `duet-premium`, plus Android-only adapters.
- Bundled pages are intercepted under the owner's existing `https://niiokai32.github.io/Kama/` origin. This keeps Auth redirects and Edge Function CORS compatible. This WebView never falls back to fetching a remote main-frame page at that origin; missing assets return 404.
- File imports and image changes use Android's document picker. Custom-deck exports use Save Document. No broad storage permission is requested.
- Copy list/invitation uses an explicit clipboard bridge. The bridge exposes only app detection, writing text to the clipboard and saving a validated JSON deck through the system picker. It cannot read arbitrary files, run commands or grant membership.
- Only packaged pages are allowed in the WebView; other HTTPS links open in the external browser. Subresource network access is restricted to the existing Supabase API; the bundled CSP also restricts HTTPS/WSS connections. File navigation, cleartext traffic, mixed content, camera/microphone/location requests and release WebView debugging are disabled.
- App backup/device transfer is disabled. Release builds use Android's secure-window flag to obscure screenshots and recent-app previews. Local saves remain in the app's private WebView profile, and exported files remain where you save them. Uninstalling normally removes app-private saves.
- Android Back closes open dialogs; the age gate and recovery dialog lead out of the app rather than being bypassed. Quick hide clears the WebView's back history when the neutral page finishes loading.
- Portrait/landscape, cutouts, system bars and the soft keyboard resize the game without an orientation restart. The platform WebView provides rendering and normal accessibility support.

This release publishes the APK and reviewed project files. A downloadable source archive is not included.

## Build or update

Requires JDK 17, Android SDK Platform 35 and Build Tools 35, with network access for the pinned Gradle/Android plugin dependencies on the first build. The Gradle wrapper is version 8.9 and Android Gradle Plugin is 8.7.2. No application npm dependencies are needed.

The bundled assets are already present in `android/app/src/main/assets/web`. To update from a complete web build, run:

```sh
node tools/prepare-web.mjs /path/to/kama/dist WEB_COMMIT_SHA
```

`prepare-web.mjs` makes Android-only copies. It adds offline local play, native clipboard/document exports and an Android privacy note; it preserves server authentication for Duet. Review the source snapshot recorded in `docs/bundled-assets.json` when updating to a new web revision. Pass the actual 40-character Git commit SHA of the web source being bundled; it is recorded with the asset hashes.

For a signed release, set `KAMA_SIGNING_PROPERTIES` to a private properties file outside the checkout:

```properties
storeFile=YOUR_PRIVATE_KEYSTORE_FILE
storePassword=YOUR_PRIVATE_PASSWORD
keyAlias=kama
keyPassword=YOUR_PRIVATE_PASSWORD
```

Then:

```sh
cd android
./gradlew :app:assembleRelease :app:lintRelease
```

Without those signing properties, Gradle produces an unsigned release for you to sign yourself. Never commit keystores, signing passwords or server keys. An update installed over this APK must use the same app ID and signing key and a higher `versionCode`.

The signing key and credentials are held privately and are excluded from GitHub and the source ZIP. Keep a secure private backup of your signing material for future updates; the public certificate alone cannot sign an update.

The release signing certificate SHA-256 is:

```text
45ff66cb81346e47e3cd65764d386fbf5e89c08de724fb4f495c68efca2f07ea
```

## Verification and limits

`assembleRelease` and `lintRelease` passed. Lint reports no errors and three non-blocking warnings (icon resource/version qualifiers and one translatable UI string). APK v2 signature and ZIP alignment verified. All 37 bundled web files match the packaged asset hashes; server sources, database files, keystores and signing credentials are absent. A pattern scan found no embedded server-secret or private-key material.

`python tools/check-web.py`, using Python Playwright with `/usr/bin/chromium`, verifies the packaged web layer under the app's HTTPS origin: offline entry, all local modes, optional forfeits, sign-in-gated Duet, native export/clipboard adapters, JSON import, phone/landscape/tablet layouts and privacy controls. No backend requests occurred in local play.

The native Activity compiled and passed Android lint, but no Android emulator or physical phone was available in this workspace. Real installation, Android document-picker/keyboard behavior and device-specific WebView behavior have not been exercised. Native bridge calls were simulated for the web-layer checks. Live Auth/Realtime/payment tests were not performed; this workspace blocks the connected project's API hostname, and payments remain disabled. The existing provider settings and commercial Duet launch checks in `docs/SECURITY-REVIEW.md` still apply.

APK SHA-256: `a050d540669b163c4173f449da32f8abf50a60123f49f3637491d0212a38db86`.

## US$2.99 and current GHS pricing

Version 1.0.2 updates Duet to US$2.99/month and adds a current GHS display from the latest published daily exchange rate. It refreshes while the offer is visible and shows the rate timestamp and attribution. No old offline cedi amount is kept; local-only play asks you to go online for the quote. Checkout remains disabled pending Paystack approval and the verified billing integration. [Pricing policy](docs/PRICING.md). Install this update over v1.0.0 to receive the new bundled UI; existing APKs do not update themselves.

## Playlists while playing

Version 1.0.2 adds **Music** to the game toolbar. Pick a starter playlist or save your own Spotify/Apple Music playlist link, open it in the provider app/browser, press Play there and return to Kama. The full playlist can continue while the game remains open, depending on the provider account and device. This is external playback, not an embedded player or account-linking integration; music controls stay with the provider. Quiet game mode mutes ambient tones and timer sounds by default after opening a playlist. Game Pause / Stop and Hide do not stop external music. [Music behavior and provider requirements](docs/MUSIC.md).
