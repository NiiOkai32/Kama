# Duet pricing

Duet's base price is **US$2.99 per month**. One paying host covers one invited partner. The Ghana-cedi display follows a published exchange rate; it is not a permanently fixed GHS price.

## Currency conversion

The public `duet-price` Edge Function fetches [ExchangeRate-API's open USD endpoint](https://www.exchangerate-api.com/docs/free) on the backend and converts the product's 299 US cents to pesewas. The service publishes rates once daily. Conversion uses fixed-point arithmetic, rounded to the nearest pesewa with half values rounded up, without a markup. No account ID, email, payment method or answer is sent to the rate provider. Only this product's converted price and source timestamps are returned, not a raw currency-data feed. The required provider attribution is visible alongside the price.

Source rates are cached for up to one hour in each Edge Function instance, or until the provider's announced next update, whichever comes first. Concurrent fetches in an instance are combined. A rate-fetch failure has a 60-second retry cooldown. Invalid, future, expired or overly old rates are rejected. There is no hardcoded cedi fallback. At greater scale, a shared durable cache and additional API abuse limits should replace reliance on per-instance caching.

The display is refreshed when Duet opens, on returning to the tab/network, and at most every five minutes while the offer is visible. A display quote lasts no more than 15 minutes and never outlives the provider's next scheduled update. The client subtracts request latency and uses the server's remaining validity, so a wrong device clock cannot keep a stale quote alive. Quotes are not saved in browser storage. Offline APK local play makes no price API request and asks the player to go online for the GHS equivalent.

“Current” means the latest available **daily published rate**, with its timestamp shown. It does not mean tick-by-tick interbank, card-issuer, cash-bureau or guaranteed settlement rates. If a fresh rate cannot be obtained, the USD base remains visible and the GHS amount is marked unavailable.

## Checkout remains closed

This update changes the product price and adds currency display. It does **not** enable Paystack checkout, charge a card/mobile-money wallet, create a payment plan or grant any membership. Paystack live approval, secret configuration and the verified billing integration remain separate requirements. `duet-price` intentionally has no Auth, database, Paystack or entitlement operations; the existing `duet` checkout command still returns 503. The authoritative membership offer and the currency quote share the same server-side `USD_AMOUNT_MINOR = 299` constant.

When checkout is implemented, it must fetch a fresh server-side rate, persist the exact GHS amount/currency and expiry against an authenticated payment reference, show that amount before confirmation, initialize Paystack in GHS minor units, and verify the same reference/amount/currency/customer before extending access. The browser's amount is never authoritative. Expired or mismatched quotes must be rejected. Display quotes in this update are not signed checkout authorizations and must not be accepted as such.

A fixed-GHS Paystack subscription plan will not track US$2.99 as FX changes. Paystack's [subscription documentation](https://paystack.com/docs/payments/subscriptions/) also states that a plan attached to initialization overrides the supplied transaction amount. Do not create a fixed-GHS plan and describe it as a floating USD equivalent. Each future renewal needs its own correct quote and a supported authorization/consent flow. Mobile money still needs a fresh authorization each month; automatic variable card renewals are not implemented here. [Paystack transaction amounts](https://paystack.com/docs/api/transaction/) use the supported currency's minor units.

## Deployment and checks

Deploy `duet-price` without gateway JWT verification because it exposes only a public, fixed-product price, and deploy `duet` with its own unchanged verified-user authentication. Both function bundles include `supabase/functions/_shared/duet-pricing.mjs`. No new database tables or migrations are required. The web client sends the publishable key in `apikey`, with no user JWT or cookies, to the price endpoint. Its existing CSP already allows this Supabase origin; no browser rate-provider connection is added.

```sh
node build.mjs
node tests/duet-price.test.mjs
node tests/duet-server.test.mjs
python -m http.server 8001 --directory dist
# Another terminal, with Python Playwright and /usr/bin/chromium:
python tests/duet-price-browser.py
```

Tests cover rounding, fixed server pricing, rejected caller-supplied amounts, stale/invalid rates, fetch coalescing, cache refresh, source outages, retry behavior, CORS/method guards, changed GHS values, wrong device clocks, offline status, expired quotes, phone/landscape/PC layouts and disabled checkout. Browser FX amounts are fixtures, not assertions about today's live exchange rate. Android's source and installable APK must be rebuilt for the updated labels and conversion display; existing APK files do not update themselves.
