const Stripe = require("stripe");
const { getVariantId, PRODUCTS } = require("../../lib/products-data");
const { createPrintifyOrder } = require("../../lib/printify");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return { statusCode: 500, body: "Server misconfigured" };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const headers = event.headers || {};
  const signature = headers["stripe-signature"] || headers["Stripe-Signature"];

  // Netlify hands us the body as a string, base64-encoded for some content
  // types — Stripe's signature check needs the exact raw bytes Stripe sent.
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;

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
        return {
          statusCode: 200,
          body: JSON.stringify({ received: true, warning: "unresolved product/variant" }),
        };
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

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error("Error handling webhook / placing Printify order:", err);
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, error: "printify_order_failed" }),
    };
  }
};
