# React + TypeScript + Vite

## Local setup

Copy `.env.example` to `.env.local`, replace the placeholders with the URL and publishable key from your Supabase project, then restart the dev server:

```bash
cp .env.example .env.local
npm run dev
```

## Verification and PayFast payments

- Email confirmation is enforced by the payment endpoint: the Supabase Auth project must have email confirmations enabled.
- Phone verification uses Supabase Auth SMS OTP. Configure an SMS provider in Supabase Auth, including rate limits and an appropriate SMS budget; users verify their number from their profile.
- Apply the SQL migrations in `supabase/migrations` before deploying functions.
- The helper identity flow uses Stripe Identity for hosted document checks. The helper must verify their phone number before starting the Stripe session, and an admin can approve or reject the result from `/admin/verifications`.
- Configure these Supabase Edge Function secrets: `PAYFAST_MERCHANT_ID`, `PAYFAST_PASSPHRASE`, `PAYFAST_MODE` (`sandbox` or `live`), `SITE_URL`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`. Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions; never expose the service role key in the browser.
- Deploy `create-payfast-checkout` with JWT verification enabled and `payfast-itn` with JWT verification disabled (as set in `supabase/config.toml`). Configure PayFast ITN delivery to the function URL. Start in sandbox mode, verify the ITN round trip, and only then switch credentials and mode to live.
- Payment status is trusted only after the server-side PayFast signature, PayFast validation response, merchant, amount, and payment reference have been checked. The browser return URL is not proof of payment. Card numbers are handled by PayFast and are never collected by GrandCaddy.
- `verification_status` should only be treated as approved after the Stripe webhook updates the helper record and an authorized admin reviews the result.



