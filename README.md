# Kama

A responsive card game with 503 supplied prompts integrated into the appropriate sections and a persistent, balanced random picker.

**[Download the Duet review build](https://github.com/NiiOkai32/Kama/raw/refs/heads/duet-premium/downloads/kama-netlify-dist.zip)**

Duet adds private online rooms for two signed-in players, shared prompts, readiness and timers. The proposed membership is **US$1.99/month**; one paying host covers their invited partner. **Checkout is disabled** pending merchant approval and billing integration. [Setup and current limits](docs/DUET.md).

Extract the ZIP and drag its **dist** folder into the **Deploys** tab of your existing Netlify site. The full source and built `dist` are included in this branch.

## Upload to your existing Netlify site

1. Download and extract `downloads/kama-netlify-dist.zip`.
2. Open your existing site in Netlify and go to **Deploys**.
3. Drag the extracted **dist** folder into the manual deployment area.

Upload the folder that directly contains `index.html`, `game.html`, and `assets/`.
No build command is needed for this manual upload. Keep the same Netlify site URL
so existing Supabase redirect settings and browser-saved cards continue to work.
The public Supabase project address is verified against the connected Kama project. The existing publishable key is preserved.

## Account connection fix

The original uploaded project URL contained a 21-character reference instead of the verified 20-character Kama project reference. The URL is corrected to `https://eqvzzfivcujfwdfdvodm.supabase.co`; the existing publishable key was checked against the project and remains valid. Both browser initialization and the build now reject malformed project references before attempting a connection. The source, built `dist`, and downloadable ZIP carry the corrected configuration.

## Added question bank and random selection

The 503 prompts in `content/kama-questions.txt` are integrated into `questions.js`:

| Supplied section | Prompts | Location in the game |
| --- | ---: | --- |
| Truth — Warm-up | 80 | Truth, Warm-up |
| Truth — Heat | 82 | Truth, Heat |
| Truth — Fire | 71 | Truth, Fire |
| Desire — Warm-up | 70 | Desire, Warm-up |
| Desire — Heat | 69 | Desire, Heat |
| Desire — Fire | 61 | Desire, Fire |
| Date night | 40 | Date Night card deck and Truth at Date Night level |
| Wind-down | 30 | Final stage of Evening |

Existing prompts are retained. Matching wording is merged after normalizing
spacing, case, trailing punctuation and apostrophes, so duplicate entries do not
increase a question's chance of being selected. Date Night and Wind-down
question cards have the same optional answer field as Truth cards, and retain
that behaviour when saved to favourites.

`random.js` replaces biased random sorting with uniform random selection from
the least-used eligible prompts. It avoids the current/previous prompt when
alternatives exist. Shared draw counts reduce repetition across Cards, Truth,
Desire, Mystery and Evening; browser-local history survives refresh and mode or
heat-level changes. No answers are stored in this shuffle history. If storage is
unavailable, selection continues with session-only history. Mystery respects the
selected heat ceiling, including Date Night.

Verified coverage of all 503 supplied entries, two complete rotations of each
Truth/Desire heat level, card-pool coverage, history after reload, saved question
controls, Fire readiness, Evening's Wind-down stage, and 320–1440px layouts.

## Mobile and PC optimization

- Phone and tablet layouts use the full play area; PC retains a sticky session sidebar.
- Main touch controls are at least 44 pixels; text and form labels are easier to read.
- Compact screens keep mode selection and primary actions within reach while scrolling.
- Portrait, landscape, display cutouts, and smaller keyboard viewports are supported.
- Timers use elapsed time and catch up after background-tab throttling.
- Dice animations cancel on mode changes and roll immediately when reduced motion is enabled.
- Large images are scaled to a maximum 640 pixels on either axis; changing artwork preserves card progress.
- JavaScript loads with `defer`; shared assets can be cached independently of page HTML.
- PC shortcuts: D draw/next evening card, T Truth, Y Desire, R roll, Space timer, right arrow skip, F favourite, ? help. Shortcuts do not intercept form typing.

## Interface changes

- Dark plum surfaces, warm accents, illustrated card deck and consistent icons.
- Responsive session controls and five modes: Cards, Truth or Desire, Dice, Evening, Duet.
- Shorter labels; themes, custom cards, instructions and extra actions open on demand.
- Matching welcome, sign-in, signup and confirmation screens.
- Existing browser storage keys are preserved for favourites, images, custom cards and history.
- Mode changes and completed cards stop their timers. Filtered themes are respected when drawing.

Duet replaces the original unsupported room API with an authenticated Supabase Edge Function, transactional room commands and RLS-protected Realtime updates. Other modes remain free. See [Duet setup](docs/DUET.md) before publishing this review build.

## Build again

Requires Node.js 18 or newer; no npm installation is necessary.

```sh
node build.mjs
```

The build copies the site and assets into `dist`, using the public values in
`supabase-config.js`. To deliberately point at another project, supply both
`KAMA_SUPABASE_URL` and `KAMA_SUPABASE_PUBLISHABLE_KEY`. The original pair
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` is also supported when the public
key is explicitly present. Never use a service-role or secret key in this site.

The existing `netlify.toml` still uses `node build.mjs` and publishes `dist`.
Supabase Auth uses the existing hosted service; its JavaScript client still
loads from the same jsDelivr URL as the uploaded version. Duet requires the new membership/room migration and Edge Function described in `docs/DUET.md`. Backend sources, migrations and tests are excluded from the public `dist` build.

## Verification

Checked JavaScript syntax, duplicate IDs, asset references, and public build
contents. Browser checks passed at widths from 320 to 1920 pixels, including short landscape viewports. Additional Chromium mobile emulation used touch events and a reduced viewport height to exercise settings with an on-screen keyboard. These are browser emulation checks, not physical-device or Safari tests.
Verified card drawing, timers, readiness gates for additional players, completion,
forfeits, favourites, custom cards, storage persistence, the four local web modes,
modals, night mode, and signed-out redirects. Additional checks covered keyboard shortcuts, background timer catch-up, cancelled dice rolls, reduced motion, tall-image memory bounds, and PC-to-tablet resizing without losing player input.

Auth screen success, error and email-confirmation states were tested with a
mocked service. No live account was created and live Supabase authentication
was not verified. The original publishable key is preserved; the malformed project URL has been corrected against the connected project metadata.
