const Stripe = require("stripe");
const { getVariantId, PRODUCTS } = require("../lib/products-data");
const { createPrintifyOrder } = require("../lib/printify");

// Stripe needs the RAW request body to verify the webhook signature, so we
// turn off Vercel's automatic JSON body parsing for this one function.
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    res.status(500).send("Server misconfigured");
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const rawBody = await readRawBody(req);
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Re-fetch with customer_details/shipping_details expanded so we have
      // the buyer's shipping address to hand to Printify.
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["customer_details"],
      });

      const { productId, color, size, quantity } = fullSession.metadata || {};
      const product = PRODUCTS[productId];
      const variantId = getVariantId(productId, color, size);

      if (!product || !variantId) {
        console.error("Could not resolve product/variant for session", session.id, {
          productId,
          color,
          size,
        });
        // Acknowledge receipt to Stripe (so it stops retrying) but flag loudly —
        // this needs a human to place the order manually and investigate.
        res.status(200).json({ received: true, warning: "unresolved product/variant" });
        return;
      }

      const shipping = fullSession.shipping_details || {};
      const shippingAddress = shipping.address || {};
      const [firstName, ...restName] = (shipping.name || "Customer").split(" ");

      await createPrintifyOrder({
        externalId: session.id,
        lineItems: [
          {
            product_id: product.printifyProductId,
            variant_id: variantId,
            quantity: Number(quantity) || 1,
          },
        ],
        addressTo: {
          first_name: firstName || "Customer",
          last_name: restName.join(" ") || "-",
          email: fullSession.customer_details?.email || "",
          phone: fullSession.customer_details?.phone || "",
          address1: shippingAddress.line1 || "",
          address2: shippingAddress.line2 || "",
          city: shippingAddress.city || "",
          region: shippingAddress.state || "",
          country: shippingAddress.country || "",
          zip: shippingAddress.postal_code || "",
        },
      });

      console.log("Printify order placed for Stripe session", session.id);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Error handling webhook / placing Printify order:", err);
    // Still return 200 so Stripe doesn't hammer retries once payment is captured —
    // but this error MUST be monitored (e.g. via Vercel logs or an alert) since
    // it means a paying customer's order didn't reach Printify.
    res.status(200).json({ received: true, error: "printify_order_failed" });
  }
};
