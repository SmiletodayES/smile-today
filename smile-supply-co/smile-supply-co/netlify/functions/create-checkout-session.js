const Stripe = require("stripe");
const { PRODUCTS, getVariantId } = require("../../lib/products-data");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server is missing STRIPE_SECRET_KEY" }),
    };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { productId, color, size, quantity } = JSON.parse(event.body || "{}");
    const qty = Number(quantity) || 1;

    const product = PRODUCTS[productId];
    if (!product) {
      return { statusCode: 400, body: JSON.stringify({ error: `Unknown product: ${productId}` }) };
    }
    if (!product.colors.includes(color) || !product.sizes.includes(size)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid color or size for this product" }) };
    }
    if (qty < 1 || qty > 10) {
      return { statusCode: 400, body: JSON.stringify({ error: "Quantity must be between 1 and 10" }) };
    }

    const variantId = getVariantId(productId, color, size);
    if (!variantId) {
      return { statusCode: 400, body: JSON.stringify({ error: "No matching product variant" }) };
    }

    const headers = event.headers || {};
    const origin = headers.origin || headers.Origin || `https://${headers.host || headers.Host}`;

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
      shipping_address_collection: {
        allowed_countries: ["ES", "PT", "FR", "DE", "IT", "NL", "BE", "IE", "GB"],
      },
      phone_number_collection: { enabled: true },
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/index.html`,
      metadata: { productId, color, size, quantity: String(qty) },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not start checkout. Please try again." }),
    };
  }
};
