const Stripe = require("stripe");
const { PRODUCTS, getVariantId } = require("../lib/products-data");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(500).json({ error: "Server is missing STRIPE_SECRET_KEY" });
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { productId, color, size, quantity } = req.body || {};
    const qty = Number(quantity) || 1;

    const product = PRODUCTS[productId];
    if (!product) {
      res.status(400).json({ error: `Unknown product: ${productId}` });
      return;
    }
    if (!product.colors.includes(color) || !product.sizes.includes(size)) {
      res.status(400).json({ error: "Invalid color or size for this product" });
      return;
    }
    if (qty < 1 || qty > 10) {
      res.status(400).json({ error: "Quantity must be between 1 and 10" });
      return;
    }

    // Confirms a Printify variant mapping exists (still a placeholder until
    // you fill in real IDs in lib/products-data.js, but this at least catches
    // typos in color/size before taking anyone's money).
    const variantId = getVariantId(productId, color, size);
    if (!variantId) {
      res.status(400).json({ error: "No matching product variant" });
      return;
    }

    const origin =
      req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: product.priceCents,
            product_data: {
              name: `${product.name} — ${color} / ${size}`,
              description: product.tagline,
            },
          },
          quantity: qty,
        },
      ],
      // Adjust to whichever countries you're prepared to ship to.
      shipping_address_collection: {
        allowed_countries: ["ES", "PT", "FR", "DE", "IT", "NL", "BE", "IE", "GB"],
      },
      phone_number_collection: { enabled: true },
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/index.html`,
      metadata: {
        productId,
        color,
        size,
        quantity: String(qty),
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    res.status(500).json({ error: "Could not start checkout. Please try again." });
  }
};
