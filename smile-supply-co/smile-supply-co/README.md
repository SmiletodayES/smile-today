# Smile Supply Co. — storefront

A real, working storefront: static front-end + two small backend functions
that take a payment with Stripe and then place the order with Printify for
production and shipping.

## How this fits with Etsy

Etsy and your own website are two **separate, parallel** sales channels —
there's no way to make a sale on your website "go through" Etsy, because
Etsy only accepts orders that started on Etsy (that's how it collects its
fee). The good news is you don't need to build anything for that side:

- **Etsy → Printify**: already possible today just by linking your Etsy
  shop to Printify in the Printify dashboard (Stores → Add store → Etsy).
  Etsy orders will auto-forward to Printify for fulfillment. Nothing in
  this project is needed for that.
- **Your website → Printify**: this project. A customer pays with Stripe on
  smiletoday.es, and the moment the payment succeeds, the backend calls the
  Printify API directly to place the order — no Etsy involved, no
  commission paid to Etsy on these sales.

So once both are set up, you'll have two independent front doors feeding
the same Printify production line.

## What's in here

```
index.html, success.html, style.css, script.js   → the storefront itself
api/products.js                                   → GET: returns the public catalog
api/create-checkout-session.js                     → POST: starts a Stripe Checkout session
api/webhook.js                                      → POST: Stripe calls this after payment;
                                                       it then places the Printify order
lib/products-data.js                                → the product catalog (single source of truth)
lib/printify.js                                     → small Printify API client
```

The product art right now is simple hand-drawn line icons as placeholders —
swap them for real product photos whenever you have them (see "Swapping in
real product photos" below).

## 1. Set up Printify

1. In Printify, create each product (Hoodie, Tee, Cap): pick a blueprint +
   print provider, upload your smiley design, choose the colors/sizes you
   want to sell, and publish it to "My stores" (create a manual/API store
   if you don't already have a non-Etsy store there).
2. Get your **Shop ID**:
   `GET https://api.printify.com/v1/shops.json` (with your API token below)
   returns a list of shops with their numeric `id`.
3. Get your **API token**: Printify → My account → Connections → API token
   (`printify.com/app/account/api`).
4. For each product, get the real IDs — easiest way is with the built-in
   helper: once you've deployed (step 4 below) with `PRINTIFY_API_TOKEN`,
   `PRINTIFY_SHOP_ID` and `ADMIN_DEBUG_KEY` set, visit
   `https://YOUR-DOMAIN/api/debug-catalog?key=YOUR_ADMIN_DEBUG_KEY` in your
   browser. It lists every product you've published with its real `id` and
   each enabled variant's `id`/`title` (e.g. `"Black / M"`). Delete
   `api/debug-catalog.js` (and the `ADMIN_DEBUG_KEY` env var) once you're
   done copying values — it's only meant to be live temporarily.
   (Alternatively, call `GET https://api.printify.com/v1/shops/{shop_id}/products.json`
   yourself with any API tool if you'd rather not deploy first.)
5. Open `lib/products-data.js` and replace:
   - `REPLACE_PRODUCT_ID__hoodie` / `__tshirt` / `__cap` with the real
     product IDs.
   - Every `variantPlaceholder(...)` — easiest way is to add a `variantIds`
     map per product, e.g.:
     ```js
     variantIds: {
       "Black-S": 12345,
       "Black-M": 12346,
       // ...
     }
     ```
     and update `getVariantId()` to read from it. The placeholder names
     already tell you exactly which product/color/size each ID belongs to
     (e.g. `REPLACE_VARIANT_ID__hoodie__Black__M`).
6. Double check `priceCents` in the same file — that's what the customer
   pays. Set it to cover Printify's cost + shipping + your margin.

## 2. Set up Stripe

1. Create a Stripe account (stripe.com) if you don't have one. Stay in
   **test mode** until everything works end-to-end.
2. Get your keys from Developers → API keys → copy the **Secret key**
   (`sk_test_...`).
3. Once deployed (step 4), go to Developers → Webhooks → Add endpoint:
   - URL: `https://YOUR-DOMAIN/api/webhook`
   - Event: `checkout.session.completed`
   - Copy the **Signing secret** (`whsec_...`).
4. You'll enter both of these as environment variables (next step).

## 3. Environment variables

Copy `.env.example` for the full list. You'll set these in Netlify (Site
configuration → Environment variables), not in a committed file:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PRINTIFY_API_TOKEN`
- `PRINTIFY_SHOP_ID`
- `ADMIN_DEBUG_KEY`

## 4. Deploy to Netlify

This project is deployed on **Netlify** (not Vercel — the backend functions
live in `netlify/functions/`, with `netlify.toml` redirecting `/api/*`
requests there so the front-end code didn't need to change). The `api/`
folder is the original Vercel-style version of the same functions, kept
only for reference — it isn't used by this deployment.

1. Push this folder to a GitHub repo (already done if you're reading this
   from the repo).
2. In Netlify: **Add new site → Import an existing project** → connect
   GitHub → pick the repo.
3. If the project lives in a subfolder of the repo (e.g. this repo has
   everything under `smile-supply-co/`), set **Base directory** to that
   subfolder during setup. Leave **Build command** empty and **Publish
   directory** as `.` (relative to the base directory) — there's no build
   step.
4. Add the five environment variables above under **Site configuration →
   Environment variables** before deploying (or trigger a redeploy after
   adding them).
5. Deploy. You'll get a `*.netlify.app` URL to test with first.

## 5. Connect smiletoday.es

In the Netlify site → **Domain management → Add a domain** → enter
`smiletoday.es`. Netlify will show you the DNS records to add at your
domain registrar (GoDaddy) — either point your registrar's nameservers at
Netlify, or add the A/CNAME records it gives you directly in GoDaddy's DNS
management screen. Once DNS propagates (up to 48h, usually much faster),
the domain points at this site.

Then go back to Stripe's webhook endpoint (step 2.3) and make sure the URL
uses the real domain, not the temporary `*.netlify.app` one.

## 6. Test before going live

1. With Stripe still in **test mode**, use test card `4242 4242 4242 4242`,
   any future expiry, any CVC, to complete a full checkout.
2. Check Netlify's function logs (Site → Logs → Functions) to confirm
   `webhook` ran and didn't error.
3. Check Printify's dashboard — a new order should appear (still against
   test data if you haven't swapped in real variant IDs yet).
4. Once happy, swap `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` for your
   **live** Stripe keys and redeploy.

## Swapping in real product photos

Right now `script.js` draws a simple line-art icon per product (the `ART`
object near the top). To use real photos instead: put image files
somewhere in this folder (e.g. `images/hoodie.jpg`), then in
`renderGrid()` and `openModal()` swap the `ART[product.image]` lookups for
an `<img src="/images/${product.image}.jpg">` tag.

## Notes / things worth knowing

- `shipping_method: 1` in `lib/printify.js` means standard shipping for
  most print providers. If a provider offers more than one shipping speed
  and you want to offer a choice, check
  `GET /v1/shops/{shop_id}/orders/shipping.json` for the valid options.
- The webhook always returns `200` to Stripe even if placing the Printify
  order fails, so Stripe doesn't retry a payment that already succeeded —
  but that also means a failed Printify order needs to be caught by
  watching Vercel's function logs (or wiring up an alert) rather than by
  Stripe telling you. Worth checking logs regularly right after launch.
- Shipping is currently offered to ES/PT/FR/DE/IT/NL/BE/IE/GB — edit
  `allowed_countries` in `api/create-checkout-session.js` to change that.
