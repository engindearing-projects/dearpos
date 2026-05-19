# DearPOS — Hosted SaaS Go-Live Runbook

Estimated time: ~30 minutes from scratch.

## 1. Neon Postgres

1. Go to neon.tech → New Project → name it `dearpos`
2. Copy the connection string (looks like `postgresql://...@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`)
3. Keep it handy — you need it for Vercel env vars

## 2. Stripe (engindearing account)

1. Go to Stripe Dashboard → Products → Add product
   - Name: "DearPOS Hosted"
   - Pricing: Recurring, $29.00/month USD
   - Copy the **Price ID** (starts with `price_`)

2. Go to Developers → Webhooks → Add endpoint
   - URL: `https://dearpos.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.deleted`
     - `customer.subscription.updated`
   - Copy the **Signing secret** (starts with `whsec_`)

3. Optionally get a Resend API key (resend.com, free tier, 100 emails/day)
   - Go to resend.com → API Keys → Create
   - Verify `hi@engindearing.soy` as the sender domain

## 3. Vercel Project

1. Go to vercel.com → New Project → Import `dearpos` repo
2. **Root Directory**: set to `apps/web`
   - (This overrides `vercel.json` build commands — Vercel auto-detects Next.js)
3. Add Environment Variables:

```
DATABASE_URL           = <neon connection string>
STRIPE_SECRET_KEY      = sk_live_...   (or sk_test_ for testing)
STRIPE_WEBHOOK_SECRET  = whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
STRIPE_PRICE_HOSTED    = price_...
RESEND_API_KEY         = re_...        (omit to get log-only fallback)
NEXT_PUBLIC_APP_URL    = https://dearpos.com
NEXT_PUBLIC_BASE_DOMAIN = dearpos.com
```

4. Deploy

## 4. Run DB Migration

After first deploy, run the schema push from your local machine:

```bash
cd ~/Projects/dearpos
DATABASE_URL="<neon-connection-string>" bun run db:push
```

This creates all tables including `HostedSubscription`.

## 5. Domain Config

### dearpos.com (base domain)
Point your DNS to Vercel (add domain in Vercel project → Domains).

### Wildcard subdomain `*.dearpos.com`
Add `*.dearpos.com` to the Vercel project domains list.
Then add a wildcard DNS record:
```
Type: CNAME
Name: *
Value: cname.vercel-dns.com
```

After this, every `merchant-slug.dearpos.com` automatically routes to the right tenant via the middleware.

### Custom domains (per-merchant, manual ops)
When a merchant wants `pos.myshop.com`:
1. Ask them to add: `CNAME pos.myshop.com → cname.vercel-dns.com`
2. Add `pos.myshop.com` to the Vercel project domains
3. Run in psql / Neon console:
   ```sql
   UPDATE "Business" SET "customDomain" = 'pos.myshop.com' WHERE slug = 'their-slug';
   ```
Build the UI for this when you have 3+ requests.

## 6. Smoke Test

1. Go to `https://dearpos.com/pricing` — verify pricing page loads
2. Click "Get started →" → fill form → verify Stripe Checkout opens (use test card `4242 4242 4242 4242`)
3. Complete checkout → verify success page
4. Check Stripe dashboard → verify subscription created
5. Check Neon → verify `HostedSubscription` + `Business` rows created
6. Check email (or Vercel logs if RESEND_API_KEY not set) → verify welcome email content
7. Go to `https://dearpos.com/pos/<slug>` → verify POS loads with PIN screen
8. If DNS wildcard is live: go to `https://<slug>.dearpos.com` → verify same POS loads

## Env vars at a glance

| Var | Where to get it |
|-----|----------------|
| `DATABASE_URL` | Neon dashboard → Connection String |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_PRICE_HOSTED` | Stripe Dashboard → Products → price ID |
| `RESEND_API_KEY` | resend.com → API Keys |
| `NEXT_PUBLIC_APP_URL` | `https://dearpos.com` |
| `NEXT_PUBLIC_BASE_DOMAIN` | `dearpos.com` |
