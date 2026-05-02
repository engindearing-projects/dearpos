# DearPOS

> *Yeah, it's a POS. Just not the way you mean it.*

Open-source point-of-sale for the small shops, cafés, and restaurants tired of paying Square 2.6% to rent software they'll never own.

Built in Spokane by [Engindearing](https://engindearing.soy).

---

## What it is

- **Self-hostable.** Run it on your own server. No subscription. No vendor lock-in. Apache-2.0.
- **Hardware-optional.** Accept cards on the iPhone or Android in your pocket via [Tap to Pay](https://stripe.com/terminal/tap-to-pay) — no card reader required to start. Plug in a BBPOS WisePOS E ($349) when you outgrow that.
- **Built for the way real shops work.** Two business profiles ship in v0.1:
  - `restaurant` — table service, modifiers (no pickles, extra cheese, well done), kitchen tickets, split tickets
  - `cafe-retail` — quick ring-up, SKU + barcode scan, modifier-heavy drinks (12oz oat latte, decaf, +oat milk)
- **Stripe Terminal** for cards. 2.7% + $0.05 tap/swipe — same Stripe account as the rest of your business.
- **Offline-first.** When the WiFi dies, the line keeps moving. Orders queue locally and sync when you're back online.

## Status

DearPOS is in active development as of May 2026. Following along is welcome; running it in production is **not recommended yet**.

**v0.1 ships:**
- [ ] Item catalog with variants and modifier groups
- [ ] Two business profile presets (restaurant + café/retail)
- [ ] Web admin (Next.js)
- [ ] iPad / Android terminal (Expo)
- [ ] Stripe Terminal checkout (Tap to Pay + BT readers)
- [ ] Receipt printing (BT thermal + SMS via Twilio)
- [ ] PIN-based staff auth + shift reports
- [ ] End-of-day Z-report

**v0.2 and beyond:** Kitchen Display System (KDS), table layout / floor plan, real inventory deductions with reorder points, online ordering, gift cards, loyalty, multi-location, Square Reader as alternate processor.

## Quick start

> Repo is being scaffolded. The instructions below describe the intended developer experience for v0.1 — they don't all work yet.

```bash
git clone https://github.com/engindearing-projects/dearpos.git
cd dearpos
bun install

# Spin up Postgres locally (or point DATABASE_URL at one you have)
docker compose up -d postgres
bun run db:push
bun run db:seed   # seeds a sample restaurant + a sample café

# Web admin at http://localhost:3000/admin
bun run dev

# In a second terminal — POS terminal app
bun run dev:terminal
```

## Architecture

```
dearpos/
├── apps/
│   ├── web/          # Next.js 16 admin dashboard + customer-facing site
│   └── terminal/     # Expo (iPad / Android tablet) POS terminal
├── packages/
│   ├── core/         # Shared types, business profiles, calculation logic
│   └── db/           # Prisma schema and client
└── docs/             # Self-host guides, profile authoring, API reference
```

**Stack:** Next.js 16 · Expo · Prisma · Postgres · Stripe Terminal · Tailwind v4 · Bun

**Design principles:**
- The data model is one spine, not two. A "12oz oat latte, decaf, +oat milk" and a "burger, no pickles, well done" are the same primitive (`Item → Variant → ModifierGroup → Modifier`). Profile configs decide which fields are visible and how the UI renders them — they don't fork the schema.
- Inventory is opt-in. v0.1 tracks orders, not stock. `InventoryComponent` exists in the schema so v0.2 can wire deductions in without remodeling.
- Money is `Decimal` everywhere. Floats touch nothing.
- Local-first via SQLite cache + sync queue on the terminal. Postgres is the source of truth, but a network blip cannot stop a transaction.

## Why we built this

We were building a custom POS for [Jewel of the North](https://jewelofthenorthrestaurant.com), a Spokane restaurant. Halfway through, we realized every other small shop in the city wants the same thing: software that fits *their* business, doesn't take 2.6% off the top forever, and doesn't disappear if a Toronto SaaS company gets acquired.

So we open-sourced it.

If you run a small shop, café, or restaurant — anywhere, but especially in Spokane — and you want to stop renting your POS, [open an issue](https://github.com/engindearing-projects/dearpos/issues) or email [hi@engindearing.soy](mailto:hi@engindearing.soy). We're picking the first ten shops to onboard personally.

## Contributing

We're not ready for outside PRs against the v0.1 milestone yet — the architecture is still moving fast. If you want to help, the most useful thing right now is:

1. **Run it.** When the quick start works end-to-end, we'll say so. Try to break it.
2. **Open issues for the shop or restaurant you actually run.** Concrete edge cases beat abstract feedback every time. "Our café charges different milk prices for hot vs. iced" is a perfect issue.
3. **Profile authors wanted.** If you run a vertical we don't ship a profile for (food truck, bakery, salon, bottle shop), tell us how it should look.

## License

[Apache-2.0](./LICENSE). Use it commercially. Sell support and customization on it. Just don't sue us.
