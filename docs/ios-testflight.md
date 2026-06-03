# iOS / TestFlight runbook

This file collects one-time founder-only Apple/Supabase console steps that the agent stack cannot perform itself (Apple Developer 2FA, Supabase dashboard UI). Keep this updated when those flows change.

## Sign in with Apple — provider configuration (PRO-552)

> **Status as of 2026-06-03:** App code shipped (`feature/redesign-v2`, commit `0c8a69d` — `app/auth/signin.tsx`, `src/components/auth/AppleSignInButton.tsx`). 0 Apple identities in `auth.identities` (verified via Supabase MCP). Provider must be enabled before TestFlight Build #24+ ships, before App Store submission June 4–8.
>
> **Authoritative values** (verified, do not re-derive):
> - iOS bundle identifier: `com.vividcoach.app` (`app.json:14` — NOT `com.vividcoach.dream`)
> - Supabase project ref: `vqnijqquqyuobautrhql` (name: "Vivid Coach")
> - Supabase callback URL: `https://vqnijqquqyuobautrhql.supabase.co/auth/v1/callback`
> - Existing ASC API key: `XG7BTKXW26` (admin; can fetch Team ID via App Store Connect)
>
> **Action owner:** founder (Apple Developer login requires 2FA on the founder's device).

### Step 1 — Apple Developer Portal

Sign in: <https://developer.apple.com/account>

1. **App ID — enable capability**
   - Certificates, Identifiers & Profiles → Identifiers → App IDs → `com.vividcoach.app`
   - Toggle **Sign in with Apple** capability ON → Save.
2. **Create Services ID**
   - Identifiers → `+` → **Services IDs** → Continue
   - Description: `VividCoach Web`
   - Identifier: `com.vividcoach.app.web`
   - Register, then re-open it → enable **Sign in with Apple** → Configure:
     - Primary App ID: `com.vividcoach.app`
     - Domains: `vqnijqquqyuobautrhql.supabase.co`
     - Return URLs: `https://vqnijqquqyuobautrhql.supabase.co/auth/v1/callback`
   - Save → Continue → Save again. Note: Apple sometimes requires domain verification — if prompted, follow the "Download" + "upload to .well-known/apple-developer-domain-association.txt" flow. (Supabase domains are pre-verified; this step usually skips.)
3. **Create Sign in with Apple Key (.p8)**
   - Keys → `+` → name `VividCoach Sign in with Apple` → check **Sign in with Apple**
   - Configure → Primary App ID: `com.vividcoach.app` → Save
   - Continue → Register → **Download the .p8 file once** (Apple will not show it again).
   - Record on the same screen: **Key ID** (10-char alphanumeric).
4. **Team ID**
   - Top-right of developer.apple.com after sign-in, or Membership tab.
   - 10-char alphanumeric.

> **Secrets handling:** the .p8 is a private key. Do NOT commit. Store alongside the existing ASC `.p8` (same handling). The agent stack does not need a copy.

### Step 2 — Supabase Auth dashboard

Sign in: <https://supabase.com/dashboard/project/vqnijqquqyuobautrhql/auth/providers>

1. Authentication → Providers → **Apple** → Enable.
2. Fill the form:
   - **Client IDs (comma-separated):** `com.vividcoach.app,com.vividcoach.app.web`
     - The iOS bundle ID is required so native `signInWithIdToken` accepts the JWT; the Services ID is the web client.
   - **Secret Key (for OAuth):** Supabase will offer two modes. Use the **"Generate a new Apple secret"** helper:
     - Team ID: (from Step 1.4)
     - Key ID: (from Step 1.3)
     - Service ID: `com.vividcoach.app.web`
     - Paste the contents of the `.p8` file (including `-----BEGIN/END PRIVATE KEY-----` lines).
   - Click **Generate Secret** then **Save**.
3. Confirm the **Callback URL (for OAuth)** shown reads `https://vqnijqquqyuobautrhql.supabase.co/auth/v1/callback`.

### Step 3 — Smoke test

On a device with a TestFlight build that includes commit `0c8a69d` (or the next TestFlight build):

1. Launch app, tap **Sign in with Apple** on the sign-in screen.
2. Complete the Apple authentication sheet.
3. Expect the app to route to `/home`.
4. Verify in Supabase: `auth.users` shows a new row with provider `apple`, and `auth.identities` has a new `apple` row.

If the device returns `error: invalid_client` or similar, the most common causes are:
- Bundle ID typo in the Supabase **Client IDs** field (must be exactly `com.vividcoach.app`).
- Services ID return URL missing or wrong.
- `.p8` file pasted with extra whitespace.

### Step 4 — Update tracking

When complete:
- Comment PRO-552 with: "Provider live in `vqnijqquqyuobautrhql` at <UTC timestamp>, smoke test passed (Supabase user id: \<uuid>)."
- Set PRO-552 to `done`.

### Apple key rotation

Apple Sign in with Apple secret JWTs derived from a `.p8` key are valid for up to **6 months (180 days)**. Supabase signs short-lived JWTs from the stored `.p8`; the **`.p8` itself does not expire** but Apple recommends rotating it annually.

**Rotation cadence: rotate the `.p8` once every 12 months.** Next rotation due: **2027-06-04** (calendar entry should be added to the founder's reminders once Step 1.3 is complete).

To rotate:
1. Apple Developer Portal → Keys → create a new Sign in with Apple key.
2. In Supabase Auth provider config, regenerate the secret using the new Key ID + new `.p8`.
3. Revoke the old key in Apple Developer Portal.
4. Update next rotation date in this file.

---

## Future runbooks

Add new TestFlight / iOS console procedures below this line as they come up (e.g., push notifications APNs key, in-app purchase agreements, App Privacy questionnaire).
