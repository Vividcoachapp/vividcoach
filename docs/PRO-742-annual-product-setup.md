# PRO-742 — Annual Subscription Setup Runbook ($69.99/yr)

Owner of code: CTO 2 (this PR). Owner of dashboard config: founder (App Store
Connect + RevenueCat logins are 2FA-gated to the founder's Apple ID and email).

Status as of 2026-06-03:

| Layer | Status | Who |
|---|---|---|
| Paywall UI — annual as lead/default, Best Value badge, monthly secondary, 21-day trial unchanged | DONE — code | CTO 2 |
| `PACKAGES` UI placeholder updated to `$69.99 / Less than $6/mo` | DONE — code | CTO 2 |
| Entitlement parity (annual + monthly → `premium`) | DONE — structural; single `SubscriptionTier='premium'` | already shipped |
| App Store Connect: create `vividcoach_premium_annual` auto-renewable subscription at $69.99/yr in the existing "VividCoach Premium" subscription group, with 21-day free trial introductory offer | PENDING — dashboard | Founder |
| RevenueCat: attach ASC product to product id `vividcoach_premium_annual`, place in the `current` (default) offering ahead of monthly | PENDING — dashboard | Founder |
| RevenueCat → `premium` entitlement: both monthly and annual products attached | PENDING — dashboard verify | Founder |
| Build with `react-native-purchases` installed + `EXPO_PUBLIC_REVENUECAT_KEY_IOS` set (separate from this issue; needed before any real purchase can occur) | PENDING — separate plumbing issue | follow-up |

The paywall code is already wired to consume RC offerings dynamically once
the SDK is unstubbed — the UI placeholders in `PACKAGES` are only the
offline fallback used during stub mode. When `Purchases.getOfferings()`
returns live data, the real ASC price string flows through `priceString`.

---

## 1. App Store Connect — create the annual auto-renewable subscription

1. **App Store Connect** → **My Apps** → **VividCoach** (bundle `com.vividcoach.app`, NOT `com.vividcoach.dream` which is the CoyForge wrapper).
2. **Monetization** → **Subscriptions**.
3. Open the existing subscription group used by `vividcoach_premium_monthly`. If no group exists yet (the monthly was never created either), create one called **VividCoach Premium** — `1 group` is correct, as both products are upgrades/downgrades of the same entitlement and Apple's rules require same-group placement.
4. Click **+** → **Create Auto-Renewable Subscription**.
   - Reference Name: `VividCoach Premium — Annual`
   - Product ID: **`vividcoach_premium_annual`** (must match the constant in `src/services/revenuecat.ts:30` exactly).
   - Subscription Duration: **1 Year**.
5. **Subscription Price**:
   - Base territory **US**, price **$69.99 USD**. Apple's pricing matrix will auto-fill every other territory; review the proposal and click **Confirm**. Do not override territory pricing unless CMO has flagged a specific market.
6. **App Store Localization (English (U.S.))**:
   - Display Name: `Annual` (this is what Apple's StoreKit metadata returns; the paywall already uses "Annual" as its label).
   - Description: `Full access to all 28 coaches, deep memory, voice coaching, and weekly recaps. Billed yearly.`
7. **Review Information**:
   - Screenshot: re-use the existing paywall screenshot from `app-store-screenshots/05-paywall.png` (PRO-631). Apple wants 6.5"/6.7" portrait.
   - Review notes: `Annual auto-renewable subscription for the existing VividCoach Premium entitlement. 21-day free trial offered to new subscribers via the introductory offer below.`
8. **Introductory Offer**:
   - Type: **Free**.
   - Duration: **3 weeks** (Apple's nearest preset to 21 days; 21 days exactly is also offered as a custom value — pick that if present).
   - Eligible: **New subscribers**.
   - Territories: **All**.
   - Start: today. End: leave open (Apple recommends "ongoing").
   - Confirm this matches the existing monthly product's introductory offer so the disclosure text in `paywall.tsx:197` ("Free for 21 days. After your trial, $69.99/year or $12.99/month. Cancel anytime.") is truthful for either tier.
9. **Save** → status moves to "Ready to Submit". The product becomes orderable from StoreKit once the next app build is in review or live; sandbox testing works immediately.

> Do NOT remove the existing `vividcoach_premium_monthly` product or change its price. Per PRO-740 and PRO-742, monthly stays as-is.

---

## 2. RevenueCat — wire the ASC product into the default offering

1. **app.revenuecat.com** → VividCoach project → **Products**.
2. **+ New** → import from App Store Connect:
   - Identifier: `vividcoach_premium_annual` (this is the RevenueCat product id, must match the constant used by `paywall.tsx`).
   - Store: App Store.
   - Apple Subscription Product ID: `vividcoach_premium_annual` (same value from step 1.4 above).
   - Duration: P1Y.
3. **Entitlements** → **`premium`** entitlement → **Attach products** → ensure both `vividcoach_premium_annual` and `vividcoach_premium_monthly` are attached. (Both should mark the customer as `premium`.)
4. **Offerings** → open the offering currently flagged as **Current** (the default served to `Purchases.getOfferings()`). If no Current exists yet, create one named `default` and mark it current.
5. In that offering's **Packages**, ensure the order is:
   - **Annual** (RC package identifier `$rc_annual` mapped to `vividcoach_premium_annual`) — **first**.
   - **Monthly** (`$rc_monthly` mapped to `vividcoach_premium_monthly`) — **second**.
   - Remove any stale "Lifetime" or other test packages.
6. **Save**. RC will start serving the new offering layout within ~30s of save (no cache flush needed; client picks up on next `getOfferings()` call).

> The paywall code reads packages by hardcoded id (`vividcoach_premium_annual`, `vividcoach_premium_monthly`) rather than by `$rc_annual`/`$rc_monthly`, which is fine — RC returns both the package identifier and the product identifier in the offerings payload. If we ever standardize on `$rc_` ids the code in `paywall.tsx:58-59` and `src/services/revenuecat.ts:11-13` will need to update together.

---

## 3. Sanity checks before App Store submission

- [ ] In ASC, both products show status **Ready to Submit** (or **Approved**).
- [ ] In RevenueCat, the Current offering's first package = `vividcoach_premium_annual` at $69.99/yr.
- [ ] In RevenueCat, the `premium` entitlement lists both products as attached.
- [ ] Sandbox account on TestFlight: open paywall → Annual is pre-selected with **BEST VALUE** badge; price shows "$69.99"; tapping **Start 21-Day Free Trial** initiates a sandbox purchase; the resulting `customerInfo.entitlements.active['premium']` is truthy on both products.
- [ ] Monthly product still selectable at $12.99/mo, unchanged.
- [ ] Trial disclosure text (`paywall.tsx:197`) reads: *"Free for 21 days. After your trial, $69.99/year or $12.99/month. Cancel anytime."* — matches the introductory offer Apple has on file.

---

## 4. Code changes in this PR

- `src/services/revenuecat.ts` — `PACKAGES` annual placeholder: `$99.00` → `$69.99`, `$8.25/mo` → `Less than $6/mo`.
- `app/paywall.tsx` — annual card badge: `RECOMMENDED` → `BEST VALUE`; savings copy: `Save 36%` → `Save 55%`.

The remaining "Activate real purchases" plumbing (`react-native-purchases` install + `EXPO_PUBLIC_REVENUECAT_KEY_IOS` provisioning + the four TODOs in `src/services/revenuecat.ts`) is a separate workstream and is **not** required for the App Store metadata review to pass — the binary can ship with the stubbed service and switch to live on a later development build. Flag a follow-up issue when the founder is ready to flip the switch.

---

## 5. References

- PRO-740 — CEO approval of Option A ($69.99/yr).
- PRO-738 / PRO-739 — Marketing research brief (LTV math, 67% annual selection rate, 21-day trial calibration).
- PRO-716 — 21-day free trial decision (unchanged here).
- `app/paywall.tsx` — paywall implementation.
- `src/services/revenuecat.ts` — RC service (stubbed).
- `src/stores/userStore.ts` — `SubscriptionTier = 'free' | 'premium'` (single entitlement → entitlement parity is structural).
