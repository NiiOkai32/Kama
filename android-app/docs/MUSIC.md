# Playlists while playing Kama

Choose **Music** in the game toolbar, select a starter playlist or save your own full Spotify/Apple Music playlist link, then choose **Open in Spotify** or **Open in Apple Music**. Press Play in that service and return to Kama. The music service can play the whole playlist while you draw cards, switch modes and continue the game. Kama does not restart the playlist for each card.

On the web, the playlist opens in a separate tab with no access back to the Kama tab (`noopener noreferrer`). On Android, the link is handed to Android's external HTTPS app handler: it can open the installed music app if configured to handle that link, or a browser otherwise. The music provider controls whether full playback, ordering, ads, downloaded music and background playback are available for the listener's account and region. Apple Music normally requires its own active subscription for full catalog playback. Kama's Duet membership does not include a music subscription.

## What is included

- Four ordinary playlist-link suggestions: Spotify's Peaceful Piano and Chill Hits, and Apple Music's Love Songs Essentials and Piano Chill. These are links, not streamed or downloaded copies of the playlists. Availability and names remain controlled by the services.
- Up to 12 personal saved playlist links, with your own label. You can rename an existing saved link by saving it again, select it quickly, or remove it.
- Whole-playlist URLs only. Spotify tracking parameters and Apple Music's single-track `i` and affiliate parameters are removed. Songs, albums, short links, lookalike domains, credentials, arbitrary ports and executable schemes are rejected. Open a short share link in the provider and copy the full playlist URL if needed.
- Quiet game mode: opening a playlist mutes Kama's ambient audio and timer tones by default. Vibration alerts remain available. You can change that preference or restore game sounds in Music. Game mode changes and returning to the game do not issue any stop/pause command to the music service.
- No provider contact on page load or while selecting/saving playlists. Only choosing Open navigates to the selected provider. Saved names/links and the quiet preference stay in the device's existing `kama_` storage. Clear this device removes them. As with the existing saves, people using the same browser/app profile share these local preferences.

## Playback controls and limits

This release is a **playlist launcher**, not account linking or an embedded streaming player. It does not sign in to Spotify/Apple, obtain OAuth/MusicKit tokens, read a music library, fetch cover art, download tracks, synchronize Duet listeners, broadcast music, or know whether the external player is currently playing. UI messages describe opening/selecting a playlist and do not invent a “now playing” state. Use the music app/tab's controls to play, pause, skip or change volume.

Kama's **Pause / Stop**, **Hide**, account deletion and browser-data clearing do **not** stop an external music player or erase that service's history. The Music panel explains this. Music preference changes do not change card readiness, progress, timers or paid access.

Spotify's current [Developer Policy](https://developer.spotify.com/policy), section III, excludes creating games with its developer platform. Its [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk) also requires prior written approval for commercial projects. Consequently this feature uses ordinary outbound share links, with no Spotify API, playback SDK or widget. This is not a representation that Spotify has approved Kama or that a future embedded integration is eligible.

Apple offers full in-app/web playback via [MusicKit](https://developer.apple.com/musickit/). That route requires Apple developer setup, a media identifier/private signing key and listener authorization/subscription checks. None has been configured for Kama. Provider credentials must not be placed in browser files or the APK. A future Apple MusicKit player would need its own integration and testing before it can replace the external handoff.

External music frames are not permitted in the Android WebView: the native interface is reserved for bundled, trusted pages. The existing script, media, frame and network policies remain strict; no third-party embed domains or remote music JavaScript have been allowed. Android uses its existing external-navigation route, so its music page does not gain access to Kama's clipboard/file bridge.

## Checks

```sh
node build.mjs
node tests/music-links.test.cjs
python -m http.server 8000 --directory dist
# Another terminal, with Python Playwright and /usr/bin/chromium:
python tests/music-browser.py
```

The six link tests cover canonical playlists, tracking/selected-song removal, rejected hostile/non-playlist links, local-data normalization and starter links. Browser checks cover the panel, saved names rendered as text, explicit provider navigation, new-tab isolation, Android-shaped link targets, quiet-mode chime/ambient suppression, persistence across reload/mode changes, restoration/removal, 320px–desktop layouts and local-data clearing. Provider pages are fixtures in these tests; no personal music account is connected or used to stream content. The suggested playlist titles/URLs were checked against public provider pages.

Real signed-in full-playlist playback and Android app-link routing must be checked on a listener's device. Native bridge calls and outbound navigation fixtures are not physical-phone or licensed-streaming tests. A new signed APK is needed for the bundled UI; older APKs do not update their assets automatically.
