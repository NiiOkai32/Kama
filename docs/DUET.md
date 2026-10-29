# Remote Duet

Two signed-in players share a private room, the same Truth/Desire prompts, individual readiness, a timer, turn changes and round completion. A host with an active membership can invite one partner without charging that partner. Local game modes remain free.

The proposed price is **US$1.99 per month**. **Purchases are disabled**: there is no merchant account, payment processor integration, subscription creation, renewal or cancellation flow yet. The checkout endpoint returns 503 and cannot grant access. No production membership has been issued.

## Deployment status

The additive migration `20261029142552_duet_memberships_and_rooms.sql` and the `duet` Edge Function are deployed to the connected Kama project, `eqvzzfivcujfwdfdvodm`. This branch contains the matching source and built `dist`; the live Pages branch is unchanged. Merge into `kama-ui-mobile-questions` to publish the interface after review.

For a different project, apply the new Duet migration once and deploy the function:

```sh
supabase functions deploy duet --project-ref YOUR_PROJECT_REF --no-verify-jwt
node build.mjs
```

The function validates every Bearer token with Supabase Auth before calling the service-only room transaction. Gateway JWT verification is disabled because the body performs authentication and supports publishable API keys. Supabase supplies server credentials to Edge Functions; never copy a service or secret key into the static site.

The allowed browser origin defaults to `https://niiokai32.github.io`. Set `KAMA_SITE_URL` and/or a comma-separated `DUET_ALLOWED_ORIGINS` for an additional Netlify or development origin. Keep the corresponding game URL in Supabase Auth's redirect allowlist. Run the included `supabase/config.toml` function configuration if using the CLI.

## Access and room security

- Only trusted server code can create or extend `duet_memberships`. Browser claims, user metadata and submitted prices never grant access.
- An unpaid account can join one room by invitation; a third account is rejected. Both players need accounts.
- Invitations contain 128 random bits in a URL fragment. Only a SHA-256 hash is stored. The host can rotate an unused invitation. Share it privately.
- Room writes use an authenticated Edge Function and a transaction with row locks. Clients have no direct write grants or execute access to `duet_command`.
- RLS limits room reads and Realtime updates to current participants while room and membership access remain valid. Stale card/revision commands are rejected.
- Rooms expire after 24 hours or at host membership expiry, whichever comes first. Leaving closes the room for both players and clears shared prompt/reveal content. Membership revocation also closes and clears its rooms.

Typed answers, images, favourites and private prompts stay on the local device. Choosing **Reveal** deliberately sends that private prompt to the partner. Shared card and revealed prompt text are stored in the room row. Access expiry is not automatic deletion: abandoned expired rows need a scheduled retention cleanup before commercial launch, and normal database backup retention also applies. Account deletion uses the existing Auth system and foreign-key cleanup.

## Payments still to complete

Obtain merchant approval for Kama's actual content and business before selecting a processor. Paystack is a candidate for Ghana cards and mobile money, subject to eligibility and supported networks. Its subscriptions currently support cards and Nigerian direct debit; mobile money needs a fresh authorization each month. Do not describe mobile money as automatic renewal.

- [Ghana mobile money support](https://support.paystack.com/en/articles/2128386)
- [Subscription payment channels](https://paystack.com/docs/payments/subscriptions/)
- [Restricted businesses](https://support.paystack.com/en/articles/2127042)

After approval, implement server-created checkout, verified signed webhooks, server-side amount/currency/product checks, idempotent payment records, refunds/revocations, renewal reminders and cancellation. For mobile money, show the actual supported local-currency quote before authorization. The UI's US$1.99 is a proposed price; this branch does not charge or convert it. Only verified billing events should extend access. Add abuse/rate limits and retention cleanup before public paid launch.

## Verification

```sh
node build.mjs
node tests/duet-server.test.mjs
node tests/duet-client.test.cjs
python -m http.server 8001 --directory dist
# In another terminal, with Python Playwright and /usr/bin/chromium installed:
python tests/duet-browser.py
```

The server and client suites each contain eight tests. The browser suite runs two separate browser contexts against a shared fixture API, with simulated authorized Realtime updates; it checks free joining, two-player limits, shared prompts/readiness/timers, private answers, explicit reveals, local mode switching, leaving and responsive layouts at 320–1440px. This is Chromium emulation, not physical-device or Safari testing.

`tests/duet-database.sql` is for a trusted SQL test runner inside `BEGIN; ... ROLLBACK;`. It uses synthetic users with `.invalid` emails and checks paid hosting, free joining, third-party denial, command conflicts, real role/RLS permissions and membership expiry. All fixtures must be rolled back. These assertions passed on the connected database, without leaving test users or access grants.

The Edge Function deployed successfully. Live end-to-end Auth/Realtime requests could not be exercised from this workspace because its outbound network policy blocks this project's API hostname. Actual two-account network testing and payment testing remain launch checks. Current advisors report no new Duet security warnings; existing usage-events metadata and password-protection findings are unrelated to this addition. See [the RLS advisory](https://supabase.com/docs/guides/database/database-linter?lint=0015_rls_references_user_metadata) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
