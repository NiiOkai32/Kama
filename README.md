# Kama

A responsive card game with 503 supplied prompts integrated into the appropriate sections and a persistent, balanced random picker.

**[Download the Netlify-ready ZIP](https://github.com/NiiOkai32/Kama/raw/refs/heads/kama-ui-mobile-questions/downloads/kama-netlify-dist.zip)**

Extract the ZIP and drag its **dist** folder into the **Deploys** tab of your existing Netlify site. The full source and built `dist` are included in this branch.

## Upload to your existing Netlify site

1. Download and extract `downloads/kama-netlify-dist.zip`.
2. Open your existing site in Netlify and go to **Deploys**.
3. Drag the extracted **dist** folder into the manual deployment area.

Upload the folder that directly contains `index.html`, `game.html`, and `assets/`.
No build command is needed for this manual upload. Keep the same Netlify site URL
so existing Supabase redirect settings and browser-saved cards continue to work.
The included public Supabase configuration is the one from the uploaded site.

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
- Responsive session controls and four modes: Cards, Truth or Desire, Dice, Evening.
- Shorter labels; themes, custom cards, instructions and extra actions open on demand.
- Matching welcome, sign-in, signup and confirmation screens.
- Existing browser storage keys are preserved for favourites, images, custom cards and history.
- Mode changes and completed cards stop their timers. Filtered themes are respected when drawing.

The original Duet implementation calls `claude.use('room')`, which is unavailable
on a standalone Netlify site. Its entry is hidden from the web interface; this
redesign does not introduce a replacement multiplayer backend.

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
loads from the same jsDelivr URL as the uploaded version. No database changes
are required by this interface update. The existing SQL migration is retained
in the source archive for reference and is not included in the public build.

## Verification

Checked JavaScript syntax, duplicate IDs, asset references, and public build
contents. Browser checks passed at widths from 320 to 1920 pixels, including short landscape viewports. Additional Chromium mobile emulation used touch events and a reduced viewport height to exercise settings with an on-screen keyboard. These are browser emulation checks, not physical-device or Safari tests.
Verified card drawing, timers, readiness gates for additional players, completion,
forfeits, favourites, custom cards, storage persistence, all four web modes,
modals, night mode, and signed-out redirects. Additional checks covered keyboard shortcuts, background timer catch-up, cancelled dice rolls, reduced motion, tall-image memory bounds, and PC-to-tablet resizing without losing player input.

Auth screen success, error and email-confirmation states were tested with a
mocked service. No live account was created and live Supabase authentication
was not verified. The uploaded public project configuration is preserved.
