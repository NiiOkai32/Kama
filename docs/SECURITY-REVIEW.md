# Suggestions review — 1 November 2026

The supplied text was reviewed as recommendations, not as instructions to change hosting, create accounts, spend money or certify legal compliance.

## Implemented

| Area | Change |
| --- | --- |
| Authentication | Existing real Supabase Auth retained. Signup and recovery forms request 12–256 characters. No client-built password store. Password reset emails return through the existing allowlisted game URL into a dedicated recovery dialog. |
| Account deletion | New authenticated `account-delete` Edge Function verifies the current session, derives the target from Auth, checks the current password again, revokes refresh sessions, closes/redacts affected rooms, then hard-deletes that account. Linked usage and membership/hosted-room rows cascade. Typed DELETE and password confirmation are required in the UI. No real account was deleted during this work. |
| Device privacy | Scoped device clearing removes only `kama_` keys and this project's Supabase browser keys. Other apps on the same GitHub Pages origin are preserved. Other open Kama tabs switch to a neutral page after clearing. Local storage remains shared by all Kama accounts on the browser profile. |
| Quick hide and consent | Sticky Pause / Stop and Hide controls. Pause stops local timers, cancels dice animation and covers the table; returning does not restart timers automatically. Escape hides the game when no dialog is open. Hide uses a neutral local page with no auth or analytics scripts. It does not wipe browser history. In the Duet review build, Pause also requests a shared timer pause; it does not revoke a partner's already-visible content. |
| Age declaration | Explicit 18+ confirmation, rechecked after 30 days and when an expired declaration's tab becomes visible. No birth date or identity document is collected. This is a self-declaration, not verified age assurance or a way to make public static bundles private. |
| Local boundaries | Each named local player can choose Yes / Maybe / No for the existing themes. Any No excludes matching cards across Cards, Truth/Desire, Mystery, Evening and favourites. Matching Maybe cards require everyone's readiness. Dice is unavailable while theme restrictions are active because its results do not have reliable theme tags. Filters use the existing keyword/theme system and can miss wording. Remote Duet's server does not yet synchronize these preferences. |
| Before reveal | Fire, Mystery and Maybe cards display their heat before readiness reveals the content. Skip remains available. |
| Safe rendering | Custom card/prompt text and favourites use text nodes. Stored image URLs no longer enter `innerHTML`; only validated JPEG data URLs can be reused. Built-in SVG artwork and static instructions still use generated trusted markup. This is not a claim that every historical browser entry is trustworthy. |
| Images | JPEG/PNG/WebP only, maximum 8 MB input and 40 million decoded pixels. Images are re-encoded into a maximum 640px JPEG in a canvas, removing original file metadata from the saved copy. There is no image upload to a server. Browser decoding may allocate memory before the decoded-size check. |
| Dependencies and CSP | Supabase JS 2.118.0 is self-hosted with its MIT license; no runtime script CDN or external fonts. The build generates a script CSP with hashes for the small inline bootstraps, prohibits objects and external scripts, and restricts connections to the configured Supabase HTTPS/WSS origin. Styles allow inline styles used by existing generated art. Root and dist policies match. |
| Referrers and headers | All pages get `no-referrer`. Netlify configuration additionally denies framing, adds `nosniff`, and disables camera/microphone/geolocation permissions. GitHub Pages cannot supply custom response headers; CSP metadata cannot enforce `frame-ancestors`, so the full header protection depends on hosting. |
| Analytics | New account-linked gameplay collection is off, including old callers. The database's authenticated/anonymous INSERT and UPDATE grants and metadata-dependent INSERT policy are removed. Existing records were not bulk-deleted. The account deletion flow removes the caller's linked records. The existing metadata-policy security advisory is resolved. |
| Privacy notice | Plain-language account, local storage, Duet, deletion, exported-file and backup limits. The notice links from welcome, account and game screens. No legal-compliance claim is made. |
| Deck backup | Custom-card JSON export and validated, confirmed import. Maximum 100 KB and 100 cards; only text, heat and timer fields are accepted, duplicates are merged and images/URLs are ignored. Imported markup is displayed as text. |
| Accessibility | Existing keyboard controls, focus indicators, reduced motion and 44px touch targets retained. Selects receive visible focus treatment, low-contrast subtle text is brightened, modal headings are labelled, and new status messages use live regions. First-visit instructions are shown once per saved browser profile. This is not a complete WCAG certification. |

## Already present and retained

- Least-used prompt selection avoids repetitions until an eligible pool rotates; browser-local history survives reload. Shuffle history stores prompt text, not typed answers.
- Seven-stage Evening has gradual intensity and a progress indicator.
- Timers use elapsed time after background throttling, with optional existing ambient sound and timer chime/vibration.
- Date Night, Truth and Wind-down already provide conversation-focused decks.
- Drink, playful and custom forfeits remain optional, with Skip available.
- Duet uses server-verified identity, RLS-protected reads, cryptographic invitation tokens, hashed stored invitations, atomic two-player joins and access expiry. Duet remains a separate unpublished review feature with checkout disabled.

## Operator settings and later work

1. **Supabase password settings:** breached-password protection is still disabled according to the live advisor. Enable it if available on the current plan, and verify server-side password length/strength, email confirmation and Auth rate-limit settings. The connected tools cannot change these settings; no plan was upgraded. A client length check supplements the provider policy and cannot replace it. [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
2. **GitHub secret scanning:** confirm secret scanning/push protection in repository settings. Only the publishable browser key belongs in the public site; all admin keys stay in Edge Function secrets. A scan of 61 Git-history blobs and five ZIP archives found no matching server-secret, private-key or privileged-JWT patterns. This is an additional check, not proof that a secret never existed or that GitHub scanning is enabled.
3. **Commercial Duet launch:** add server-side per-user/IP abuse limits, scheduled room/usage retention, synchronized boundaries, merchant-approved billing and real two-account network tests. Membership access expiry is not data deletion. No cron or retention deletion of existing user records was silently enabled.
4. **PWA/offline install:** deferred. Offline storage and home-screen naming need an explicit privacy design, cache invalidation and signed-out-device tests before caching intimate content. A service worker is not needed for the requested privacy fixes.
5. **Hosting and legal:** no Cloudflare/DNS migration or third-party registration was performed. Ghana Data Protection Commission registration and any other operator obligations require the owner's assessment and actual details. A code change cannot establish compliance.
6. **Other game ideas:** ratings that influence draws, a separate reshuffle control, swipe-to-skip and a neutral install identity remain future product choices. Existing balanced random selection, tap controls and neutral quick hide cover the immediate use cases without introducing accidental gesture skips or another sensitive preference record.

Invitation links use URL fragments, which do not go to the HTTP server, but links and clipboards can still disclose them. Manual code entry is also supported. This is an intentional tradeoff for remote invitations, documented in the notice, rather than a claim that a secret link is risk-free.

## Deployment and verification

The analytics migration and `account-delete` Edge Function are deployed to the existing Kama project, `eqvzzfivcujfwdfdvodm`. Other existing data was preserved. The source and built dist include the same controls. The Duet review branch carries the same local features.

Eight account-deletion handler tests cover missing sessions, password failure, mismatched reauthentication, forged targets, global session revocation, room cleanup, provider failures and CORS/body limits. Browser checks cover age/onboarding, pause, No/Maybe boundaries, custom-text injection, JSON import, password recovery, guarded deletion errors, scoped device clearing, quick hide, and real pinned-client loading under CSP. Existing UI/device/forfeit/Duet fixture regressions also passed.

The database verifies anonymous/authenticated event INSERT is denied and its unsafe metadata policy is gone. No live user was created, emailed, charged or deleted by the tests. Live password email delivery and live destructive deletion were not exercised: the execution workspace blocks this project's API hostname. Handler/provider calls and browser account actions were tested using fixtures. Actual account recovery/deletion on a disposable account remains a launch check. Physical devices and Safari were not tested.

Pricing update, 6 November 2026: the monthly USD base is now US$2.99, with a server-derived daily-rate GHS preview. See [pricing controls and remaining checkout work](PRICING.md).
